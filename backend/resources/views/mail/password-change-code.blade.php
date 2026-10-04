<x-mail::message>
Hello {{ $name }},

Use this one-time code to confirm your MedAccess password change. It expires in {{ $minutes }} minutes.

**{{ $code }}**

If you did not request this change, you can ignore this email. Your current password stays the same.

Thanks,<br>
MedAccess Sudan
</x-mail::message>
