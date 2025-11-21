<script lang="ts">
	import { goto } from '$app/navigation';

	let name = '';
	let email = '';
	let password = '';
	let error = '';

	async function handleSignUp() {
		// TODO: Implement with auth service
		console.log('Sign up', name, email);
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-pink-900">
	<div class="max-w-md w-full p-8 bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl">
		<h1 class="text-3xl font-bold text-white text-center mb-8">Sign Up</h1>

		{#if error}
			<div class="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4">
				<p class="text-red-200 text-sm">{error}</p>
			</div>
		{/if}

		<form on:submit|preventDefault={handleSignUp} class="space-y-4">
			<div>
				<label for="name" class="block text-white text-sm font-medium mb-2">Name</label>
				<input
					id="name"
					type="text"
					bind:value={name}
					required
					class="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500"
				/>
			</div>

			<div>
				<label for="email" class="block text-white text-sm font-medium mb-2">Email</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					required
					class="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500"
				/>
			</div>

			<div>
				<label for="password" class="block text-white text-sm font-medium mb-2">Password</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					required
					minlength="8"
					class="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500"
				/>
			</div>

			<button
				type="submit"
				class="w-full px-6 py-3 bg-pink-600 text-white font-semibold rounded-lg hover:bg-pink-700 transition"
			>
				Sign Up
			</button>
		</form>

		<p class="text-center text-white/70 mt-4">
			Already have an account?
			<a href="/auth/signin" class="text-pink-400 hover:text-pink-300 underline">Sign in</a>
		</p>
	</div>
</div>
