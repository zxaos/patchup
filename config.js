const core = require('@actions/core');
const check = require('check-types');
const path = require('path');

let config = {};

function retrieveParameters() {
	const conflictReviewers = splitCommaString(
		core.getInput('conflict_reviewers', {required: false})
	);
	const localBranch = core.getInput('local_branch', {required: false}) || 'trunk';
	const localPath = path.resolve(
		core.getInput('local_path', {required: false}) ||
		process.env.GITHUB_WORKSPACE
	);
	const targetTag = core.getInput('target_tag', {required: true});
	const token = core.getInput('github_token', {required: true});
	const upstreamBranch = core.getInput('upstream_branch', {required: false}) || localBranch;
	const upstreamRepo = core.getInput('upstream_repo', {required: true});
	const upstreamRepoURL = `https://github.com/${core.getInput('upstream_repo', {required: true})}`;
	return Object.freeze({conflictReviewers, localBranch, localPath, targetTag, token, upstreamBranch, upstreamRepo, upstreamRepoURL});
}

function validateParameters(p) {
	check.nonEmptyString(p.localBranch);
	check.nonEmptyString(p.targetTag);
	check.nonEmptyString(p.token);
	check.nonEmptyString(p.upstreamBranch);
	check.match(p.upstreamRepo, /\w+\/\w+/);
}

function splitCommaString(string) {
	if (typeof string === 'string') {
		return string.split(/, */)
			.filter(i => i);
	}

	return [];
}

function get() {
	try {
		config = retrieveParameters();
		validateParameters(config);
	} catch (error) {
		core.setFailed(error.message);
	}

	return config;
}

exports.get = get;
