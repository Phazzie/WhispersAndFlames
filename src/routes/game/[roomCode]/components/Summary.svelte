<script lang="ts">
	import type { GameSeam } from '$contracts/Game';

	export let game: GameSeam;

	function startNewGame() {
		// TODO: Implement new game creation
		console.log('Starting new game');
	}
</script>

<div class="flex items-center justify-center min-h-screen p-4">
	<div class="max-w-4xl w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
		<h1 class="text-4xl font-bold text-white text-center mb-8">Session Complete</h1>

		{#if game.summary}
			<div class="bg-white/5 rounded-lg p-6 mb-6">
				<h2 class="text-2xl font-semibold text-white mb-4">Summary</h2>
				<p class="text-white/90 whitespace-pre-wrap">{game.summary}</p>
			</div>
		{/if}

		{#if game.therapistNotes}
			<div class="bg-white/5 rounded-lg p-6 mb-6">
				<h2 class="text-2xl font-semibold text-white mb-4">Therapist Notes</h2>
				<p class="text-white/90 whitespace-pre-wrap">{game.therapistNotes}</p>
			</div>
		{/if}

		{#if game.visualMemory}
			<div class="bg-white/5 rounded-lg p-6 mb-8">
				<h2 class="text-2xl font-semibold text-white mb-4">Visual Memory</h2>
				<p class="text-white/70 italic">{game.visualMemory.imagePrompt}</p>
			</div>
		{/if}

		<div class="flex gap-4">
			<button
				on:click={startNewGame}
				class="flex-1 px-6 py-3 bg-pink-600 text-white font-semibold rounded-lg hover:bg-pink-700 transition"
			>
				Play Again
			</button>
			<button
				class="flex-1 px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition"
			>
				Return Home
			</button>
		</div>
	</div>
</div>
