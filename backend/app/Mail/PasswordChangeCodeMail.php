<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordChangeCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $code,
        public string $maskedEmail,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'MedAccess password change verification',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.password-change-code',
            with: [
                'name' => $this->user->name,
                'code' => $this->code,
                'minutes' => 10,
            ],
        );
    }
}
