<script lang="ts">
	import type { GameSeam, SpicyLevel } from '$contracts/Game';

	export let game: GameSeam;

	const spicyLevels: { level: SpicyLevel; description: string }[] = [
		{ level: 'Mild', description: 'Flirty glances, emotional intimacy, romantic tension' },
		{ level: 'Medium', description: 'Sensual scenarios, specific attractions, building heat' },
		{ level: 'Hot', description: 'Explicit desires, detailed fantasies, clear sexual content' },
		{ level: 'Extra-Hot', description: 'Boundary-pushing, unfiltered, intense exploration' }
	];

	let selectedLevel: SpicyLevel | null = null;
	let chaosMode = false;

	function selectLevel(level: SpicyLevel) {
		selectedLevel = level;
	}

	function submitSpicyLevel() {
		// TODO: Implement spicy level submission
		console.log('Selected level:', selectedLevel, 'Chaos:', chaosMode);
	}
</script>

<div class="flex items-center justify-center min-h-screen p-4">
	<div class="max-w-2xl w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
		<h1 class="text-4xl font-bold text-white text-center mb-4">Choose Your Temperature</h1>
		<p class="text-center text-white/70 mb-8">How spicy do you want this session?</p>

		<div class="space-y-4 mb-8">
			{#each spicyLevels as { level, description }}
				<button
					on:click={() => selectLevel(level)}
					class="w-full p-6 rounded-lg border-2 text-left transition {
						selectedLevel === level
							? 'bg-pink-600/30 border-pink-500'
							: 'bg-white/5 border-white/30 hover:border-white/50'
					}"
				>
					<h3 class="text-2xl font-semibold text-white mb-2">{level}</h3>
					<p class="text-white/70">{description}</p>
				</button>
			{/each}
		</div>

		<label class="flex items-center justify-center space-x-3 mb-6 cursor-pointer">
			<input
				type="checkbox"
				bind:checked={chaosMode}
				class="w-5 h-5 rounded border-white/30 bg-white/10 text-pink-600 focus:ring-2 focus:ring-pink-500"
			/>
			<span class="text-white text-lg">Enable Chaos Mode (random spicy upgrades)</span>
		</label>

		<button
			on:click={submitSpicyLevel}
			disabled={!selectedLevel}
			class="w-full px-6 py-3 bg-pink-600 text-white font-semibold rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
		>
			Continue
		</button>
	</div>
</div>
