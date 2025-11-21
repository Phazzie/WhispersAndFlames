<script lang="ts">
	import type { GameSeam } from '$contracts/Game';

	export let game: GameSeam;

	function toggleReady() {
		// TODO: Implement ready toggle
		console.log('Toggle ready');
	}

	function startGame() {
		// TODO: Implement start game
		console.log('Start game');
	}
</script>

<div class="flex items-center justify-center min-h-screen p-4">
	<div class="max-w-2xl w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
		<h1 class="text-4xl font-bold text-white text-center mb-4">Game Lobby</h1>
		<p class="text-center text-white/70 text-2xl mb-8">Room Code: {game.roomCode}</p>

		<div class="space-y-4 mb-8">
			<h2 class="text-2xl font-semibold text-white">Players ({game.players.length}/3)</h2>
			{#each game.players as player}
				<div class="flex items-center justify-between bg-white/5 p-4 rounded-lg">
					<span class="text-white font-medium">{player.name}</span>
					<span class="text-sm {player.isReady ? 'text-green-400' : 'text-white/50'}">
						{player.isReady ? 'Ready' : 'Not Ready'}
					</span>
				</div>
			{/each}
		</div>

		<div class="space-y-4">
			<button
				on:click={toggleReady}
				class="w-full px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition"
			>
				Toggle Ready
			</button>

			{#if game.players.every(p => p.isReady) && game.players.length >= 2}
				<button
					on:click={startGame}
					class="w-full px-6 py-3 bg-pink-600 text-white font-semibold rounded-lg hover:bg-pink-700 transition"
				>
					Start Game
				</button>
			{/if}
		</div>
	</div>
</div>
