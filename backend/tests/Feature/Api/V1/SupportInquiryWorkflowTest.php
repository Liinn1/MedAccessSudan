<?php

namespace Tests\Feature\Api\V1;

use App\Enums\UserRole;
use App\Models\CustomerInquiry;
use App\Models\CustomerInquiryMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SupportInquiryWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_submission_validates_and_creates_exactly_one_inquiry_with_one_message(): void
    {
        $this->postJson('/api/v1/contact', [
            'name' => '',
            'email' => 'invalid',
            'subject' => '',
            'message' => 'short',
        ])->assertUnprocessable()->assertJsonValidationErrors(['name', 'email', 'subject', 'message']);

        $response = $this->postJson('/api/v1/contact', $this->payload('Public Visitor', 'visitor@example.test'))
            ->assertCreated();

        $this->assertSame(1, CustomerInquiry::query()->count());
        $this->assertSame(1, CustomerInquiryMessage::query()->count());
        $this->assertDatabaseHas('customer_inquiries', [
            'id' => $response->json('data.id'),
            'email' => 'visitor@example.test',
            'status' => 'new',
        ]);
    }

    public function test_each_authenticated_supported_role_submits_to_the_same_inquiry_tables(): void
    {
        foreach ([UserRole::Patient, UserRole::Doctor, UserRole::Laboratory] as $role) {
            $user = User::factory()->create(['role' => $role, 'is_active' => true]);
            Sanctum::actingAs($user);
            $this->postJson('/api/v1/contact', $this->payload($user->name, $user->email))
                ->assertCreated();
        }

        $this->assertSame(3, CustomerInquiry::query()->count());
        $this->assertSame(3, CustomerInquiryMessage::query()->where('author_type', 'customer')->count());
    }

    public function test_normal_roles_cannot_read_or_resolve_support_queries(): void
    {
        $inquiry = CustomerInquiry::query()->create([
            'name' => 'Protected Sender',
            'email' => 'protected@example.test',
            'subject' => 'Private support request',
            'status' => 'new',
            'last_message_at' => now(),
        ]);

        foreach ([UserRole::Patient, UserRole::Doctor, UserRole::Laboratory] as $role) {
            Sanctum::actingAs(User::factory()->create(['role' => $role, 'is_active' => true]));
            $this->getJson('/api/v1/admin/inquiries')->assertForbidden();
            $this->getJson("/api/v1/admin/inquiries/{$inquiry->id}")->assertForbidden();
            $this->patchJson("/api/v1/admin/inquiries/{$inquiry->id}", ['status' => 'resolved'])->assertForbidden();
        }
    }

    public function test_admin_can_list_open_and_persist_resolution_of_the_same_public_query(): void
    {
        $id = $this->postJson('/api/v1/contact', $this->payload('Lifecycle Sender', 'lifecycle@example.test'))
            ->assertCreated()
            ->json('data.id');

        Sanctum::actingAs(User::factory()->create(['role' => UserRole::Admin, 'is_active' => true]));
        $this->getJson('/api/v1/admin/inquiries?status=new')
            ->assertOk()
            ->assertJsonPath('data.inquiries.0.id', $id);
        $this->getJson("/api/v1/admin/inquiries/{$id}")
            ->assertOk()
            ->assertJsonPath('data.messages.0.body', 'This is a valid support request used by the regression test.');
        $this->patchJson("/api/v1/admin/inquiries/{$id}", ['status' => 'in_progress'])
            ->assertOk()
            ->assertJsonPath('data.status', 'in_progress');
        $this->patchJson("/api/v1/admin/inquiries/{$id}", ['status' => 'resolved'])
            ->assertOk()
            ->assertJsonPath('data.status', 'resolved');

        $this->assertDatabaseHas('customer_inquiries', ['id' => $id, 'status' => 'resolved']);
        $this->getJson("/api/v1/admin/inquiries/{$id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'resolved');
    }

    private function payload(string $name, string $email): array
    {
        return [
            'name' => $name,
            'email' => $email,
            'subject' => 'Support workflow verification',
            'message' => 'This is a valid support request used by the regression test.',
        ];
    }
}
