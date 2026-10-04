<x-mail::message>
Hello {{ $name }},

Use this one-time code to reset your MedAccess password. It expires in {{ $minutes }} minutes.

**{{ $code }}**

If you did not request a password reset, you can ignore this email. Your current password stays the same.

Thanks,<br>
MedAccess Sudan
</x-mail::message>
