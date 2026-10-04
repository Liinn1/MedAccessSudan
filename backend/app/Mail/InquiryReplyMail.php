<?php

namespace App\Mail;

use App\Models\CustomerInquiry;
use App\Models\CustomerInquiryMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class InquiryReplyMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public CustomerInquiry $inquiry,
        public CustomerInquiryMessage $reply,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'MedAccess: '.$this->inquiry->subject,
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.inquiry-reply',
            with: [
                'name' => $this->inquiry->name,
                'body' => $this->reply->body,
                'subject' => $this->inquiry->subject,
            ],
        );
    }
}
