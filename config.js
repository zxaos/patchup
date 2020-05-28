const core = require('@actions/core');
const check = require('check-types');
const path = require('path');

let config = {};

function retrieveParameters() {
	const localPath = path.resolve(
		core.getInput('local_path', {required: false}) ||
		process.env.GITHUB_WORKSPACE
	);
	const localBranch = core.getInput('local_branch', {required: true});
	const upstreamRemote = core.getInput('upstream_remote', {required: true});
	const upstreamBranch = core.getInput('upstream_branch', {required: true});
	const strategy = core.getInput('strategy', {required: true});
	const conflictReviewers = splitCommaString(
		core.getInput('conflict_reviewers', {required: false})
	);
	const targetTag = core.getInput('target_tag', {required: false});
	return Object.freeze({localPath, localBranch, upstreamRemote, upstreamBranch, strategy, conflictReviewers, targetTag});
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

try {
	config = retrieveParameters();
	validateParameters(config);
} catch (error) {
	core.setFailed(error.message);
}

module.exports = config;
