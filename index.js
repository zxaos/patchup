'use strict';

const core = require('@actions/core');
const wait = require('./wait');
const check = require('check-types');

async function run() {
	try {
		const parameters = retrieveParameters();
		validateParameters(parameters);
		console.log(parameters);

		// Get local
		const ms = core.getInput('milliseconds');
		console.log(`Waiting ${ms} milliseconds ...`);

		core.debug((new Date()).toTimeString());
		await wait(Number.parseInt(ms, 10));
		core.debug((new Date()).toTimeString());

		core.setOutput('time', new Date().toTimeString());
	} catch (error) {
		core.setFailed(error.message);
	}
}

function retrieveParameters() {
	const localBranch = core.getInput('local_branch', {required: true});
	const upstream = core.getInput('upstream_repo', {required: true});
	const upstreamBranch = core.getInput('upstream_branch', {required: true});
	const strategy = core.getInput('strategy', {required: true});
	const conflictReviewers = splitCommaString(
		core.getInput('conflict_reviewers', {required: false})
	);
	const targetTag = core.getInput('target_tag', {required: false});
	// Const owner = core.getInput('owner', { required: false }) || context.repo.owner;
	return {localBranch, upstream, upstreamBranch, strategy, conflictReviewers, targetTag};
}

function validateParameters(p) {
	const validStrategies = ['merge', 'rebase', 'rebase_onto', 'reset'];
	check.in(p.strategy, validStrategies);

	// Target tag must be set if strategy is rebase_onto
	if (p.strategy === 'rebase_onto') {
		check.nonEmptyString(p.targetTag);
	}

	check.nonEmptyString(p.upstream);
	check.nonEmptyString(p.localBranch);
	check.nonEmptyString(p.upstreamBranch);
}

function splitCommaString(string) {
	if (typeof string === 'string') {
		return string.split(/, */)
			.filter(i => i);
	}

	return [];
}

run();
