<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class CreateSuperAdmin extends Command
{
    protected $signature = 'medaccess:create-super-admin {--email=} {--name=} {--phone=}';
    protected $description = 'Create the initial MedAccess Super Admin using a securely prompted password';

    public function handle(): int
    {
        $email = $this->option('email') ?: $this->ask('Email');
        $name = $this->option('name') ?: $this->ask('Name');
        $password = $this->secret('Password (minimum 12 characters)');
        $data = ['email' => $email, 'name' => $name, 'phone' => $this->option('phone'), 'password' => $password];
        $validator = Validator::make($data, ['email' => ['required', 'email', 'unique:users,email'], 'name' => ['required', 'string', 'max:120'], 'phone' => ['nullable', 'string', 'max:30', 'unique:users,phone'], 'password' => ['required', 'string', 'min:12']]);
        if ($validator->fails()) { foreach ($validator->errors()->all() as $error) $this->error($error); return self::FAILURE; }
        User::create([...$data, 'password' => Hash::make($password), 'role' => UserRole::SuperAdmin, 'is_active' => true]);
        $this->info('Super Admin created successfully.');
        return self::SUCCESS;
    }
}
