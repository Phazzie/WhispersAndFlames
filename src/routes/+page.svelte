<script lang="ts">
	// Home page
	import { goto } from '$app/navigation';

	let playerName = '';
	let roomCode = '';

	async function createGame() {
		// TODO: Implement with game service
		console.log('Creating game for', playerName);
	}

	async function joinGame() {
		// TODO: Implement with game service
		console.log('Joining game', roomCode, 'as', playerName);
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-pink-900">
	<div class="max-w-md w-full p-8 bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl">
		<h1 class="text-4xl font-bold text-white text-center mb-8">Whispers and Flames</h1>

		<div class="space-y-6">
			<div>
				<label for="playerName" class="block text-white text-sm font-medium mb-2">
					Your Name
				</label>
				<input
					id="playerName"
					type="text"
					bind:value={playerName}
					placeholder="Enter your name"
					class="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500"
				/>
			</div>

			<button
				on:click={createGame}
				disabled={!playerName.trim()}
				class="w-full px-6 py-3 bg-pink-600 text-white font-semibold rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
			>
				Create Game
			</button>

			<div class="relative">
				<div class="absolute inset-0 flex items-center">
					<div class="w-full border-t border-white/30"></div>
				</div>
				<div class="relative flex justify-center text-sm">
					<span class="px-2 bg-transparent text-white/70">or join existing game</span>
				</div>
			</div>

			<div>
				<label for="roomCode" class="block text-white text-sm font-medium mb-2">
					Room Code
				</label>
				<input
					id="roomCode"
					type="text"
					bind:value={roomCode}
					placeholder="Enter room code"
					class="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500 uppercase"
					maxlength="6"
				/>
			</div>

			<button
				on:click={joinGame}
				disabled={!playerName.trim() || !roomCode.trim()}
				class="w-full px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
			>
				Join Game
			</button>
		</div>
	</div>
</div>
