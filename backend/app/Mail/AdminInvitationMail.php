<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $admin,
        public string $setupUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Set up your MedAccess administrator account',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.admin-invitation',
            with: [
                'name' => $this->admin->name,
                'setupUrl' => $this->setupUrl,
            ],
        );
    }
}
