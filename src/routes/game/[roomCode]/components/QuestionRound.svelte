<script lang="ts">
	import type { GameSeam } from '$contracts/Game';

	export let game: GameSeam;

	let answer = '';
	let isSubmitting = false;

	function submitAnswer() {
		// TODO: Implement answer submission
		console.log('Submitting answer:', answer);
		isSubmitting = true;
	}

	function revealAnswers() {
		// TODO: Implement reveal logic
		console.log('Revealing answers');
	}

	$: currentQuestion = game.questions[game.currentQuestionIndex];
	$: questionNumber = game.currentQuestionIndex + 1;
	$: totalQuestions = game.questions.length;
</script>

<div class="flex items-center justify-center min-h-screen p-4">
	<div class="max-w-3xl w-full bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
		<div class="mb-4">
			<p class="text-white/70 text-center">Question {questionNumber} of {totalQuestions}</p>
			<div class="w-full bg-white/20 rounded-full h-2 mt-2">
				<div
					class="bg-pink-600 h-2 rounded-full transition-all"
					style="width: {(questionNumber / totalQuestions) * 100}%"
				></div>
			</div>
		</div>

		<h2 class="text-3xl font-bold text-white text-center mb-8">{currentQuestion}</h2>

		{#if !isSubmitting}
			<textarea
				bind:value={answer}
				placeholder="Type your answer here..."
				rows="6"
				class="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none mb-6"
			></textarea>

			<button
				on:click={submitAnswer}
				disabled={!answer.trim()}
				class="w-full px-6 py-3 bg-pink-600 text-white font-semibold rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
			>
				Submit Answer
			</button>
		{:else}
			<div class="text-center">
				<p class="text-white text-xl mb-6">Waiting for other players...</p>
				<button
					on:click={revealAnswers}
					class="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition"
				>
					Reveal Answers
				</button>
			</div>
		{/if}
	</div>
</div>
