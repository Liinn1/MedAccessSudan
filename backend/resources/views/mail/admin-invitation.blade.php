<x-mail::message>
Hello {{ $name }},

A MedAccess Super Administrator created an administrator account for you. Choose your own password using the button below. This link expires, and nobody else is given your password.

<x-mail::button :url="$setupUrl">
Set up password
</x-mail::button>

If you did not expect this invitation, you can ignore this email.

Thanks,<br>
MedAccess Sudan
</x-mail::message>
