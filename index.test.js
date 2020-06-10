/* eslint-env jest */
const {promisify} = require('util');
const path = require('path');
const fs = require('fs');
const tar = require('tar-fs');
const rimraf = promisify(require('rimraf'));
const cpr = require('recursive-copy');

const git = require('simple-git/promise');
const cp = require('child_process');

const patchup = require('.');

const TEST_REPO_PATH = './test-repos/test';

beforeAll(() => {
	return setupTestRepos();
});

beforeEach(async () => {
	await rimraf(TEST_REPO_PATH);
	await cpr('./test-repos/local', TEST_REPO_PATH, {results: false});
});

// Shows how the runner will run a javascript action with env / stdout protocol
test.skip('test runs', () => {
	const env = Object.create(process.env);
	env.INPUT_LOCAL_BRANCH = 'master';
	env.INPUT_UPSTREAM_REPO = 'upstream';
	env.INPUT_UPSTREAM_BRANCH = 'master';
	env.INPUT_STRATEGY = 'merge';
	const ip = path.join(__dirname, 'index.js');
	console.log(cp.execSync(`${process.execPath} ${ip}`, {env}).toString());
});

/* Test cases:
 *
 * Where t is tagged commit and t' is the tagged commit after rebase:
 */

/* multiple local commits:
 * upstream: a -> b -> c -> d
 * local: a -> b -> t -> f
 * result: a -> b -> c -> d -> t' -> f'
 */
test('multiple local commits', async () => {
	const repo = git(TEST_REPO_PATH);
	const testConfig = {
		localPath: TEST_REPO_PATH,
		localBranch: 'multiple-local',
		upstreamRemote: 'upstream',
		upstreamBranch: 'multiple-local',
		strategy: 'rebaseOnto',
		targetTag: 'test-multiple-local'
	};

	const [initialTargetTagSHA, initialHeadSHA, initialLogs] = await Promise.all([
		repo.revparse([testConfig.targetTag]),
		repo.revparse([testConfig.localBranch]),
		repo.log([testConfig.localBranch])
	]);

	expect(initialTargetTagSHA).toBe('c6d732c59ee20379ae9489546c9f8fd32603ecea');
	expect(initialHeadSHA).toBe('d5636e67719df17b89740d6e432e1365cd3baa4b');
	expect(initialLogs.total).toBe(4);

	await patchup.rebaseOnto(testConfig);

	const [finalTargetTagSHA, finalHeadSHA, finalLogs] = await Promise.all([
		repo.revparse([testConfig.targetTag]),
		repo.revparse([testConfig.localBranch]),
		repo.log([testConfig.localBranch])
	]);

	expect(finalTargetTagSHA).not.toBe(initialTargetTagSHA);
	expect(finalHeadSHA).not.toBe(initialHeadSHA);
	expect(finalLogs.total).toBe(6);
});

/*
 * Single local commit:
 * upstream: a -> b -> c -> d
 * local: a -> b -> t
 * result: a -> b -> c -> d -> t'
 */
test('single local commit', async () => {
	const repo = git(TEST_REPO_PATH);
	const testConfig = {
		localPath: TEST_REPO_PATH,
		localBranch: 'single-local',
		upstreamRemote: 'upstream',
		upstreamBranch: 'single-local',
		strategy: 'rebaseOnto',
		targetTag: 'test-single-local'
	};

	const [initialTargetTagSHA, initialHeadSHA, initialLogs] = await Promise.all([
		repo.revparse([testConfig.targetTag]),
		repo.revparse([testConfig.localBranch]),
		repo.log([testConfig.localBranch])
	]);

	expect(initialTargetTagSHA).toBe('c6d732c59ee20379ae9489546c9f8fd32603ecea');
	expect(initialHeadSHA).toBe('c6d732c59ee20379ae9489546c9f8fd32603ecea');
	expect(initialLogs.total).toBe(3);

	await patchup.rebaseOnto(testConfig);

	const [finalTargetTagSHA, finalHeadSHA, finalLogs] = await Promise.all([
		repo.revparse([testConfig.targetTag]),
		repo.revparse([testConfig.localBranch]),
		repo.log([testConfig.localBranch])
	]);

	expect(finalTargetTagSHA).not.toBe(initialTargetTagSHA);
	expect(finalHeadSHA).not.toBe(initialHeadSHA);
	expect(finalLogs.total).toBe(5);
});

/* Local conflict:
 * (both e and t add the same file with different contents)
 * upstream: a -> b -> c -> d -> e
 * local: a -> b -> t
 * result: PR created
 */
test('local conflict', async () => {
	const repo = git(TEST_REPO_PATH);
	const testConfig = {
		localPath: TEST_REPO_PATH,
		localBranch: 'local-conflict',
		upstreamRemote: 'upstream',
		upstreamBranch: 'local-conflict',
		strategy: 'rebaseOnto',
		targetTag: 'test-local-conflict'
	};

	const [initialTargetTagSHA, initialHeadSHA, initialLogs] = await Promise.all([
		repo.revparse([testConfig.targetTag]),
		repo.revparse([testConfig.localBranch]),
		repo.log([testConfig.localBranch])
	]);

	expect(initialTargetTagSHA).toBe('ca60987df9c1e628587eafd6ef3ac55a8246a5ee');
	expect(initialHeadSHA).toBe('ca60987df9c1e628587eafd6ef3ac55a8246a5ee');
	expect(initialLogs.total).toBe(3);

	return expect(patchup.rebaseOnto(testConfig)).resolves.toBe(false);
});

/* Upstream conflict
 * (b' has new content and c' and d' have new SHAs)
 * upstream: a -> b' -> c' -> d'
 * local: a -> b -> t -> f
 * result: a -> b' -> c' -> d' -> t' -> f'
 */
test('upstream conflict', async () => {
	const repo = git(TEST_REPO_PATH);
	const testConfig = {
		localPath: TEST_REPO_PATH,
		localBranch: 'upstream-conflict',
		upstreamRemote: 'upstream',
		upstreamBranch: 'upstream-conflict',
		strategy: 'rebaseOnto',
		targetTag: 'test-upstream-conflict'
	};

	const [initialTargetTagSHA, initialHeadSHA, initialLogs] = await Promise.all([
		repo.revparse([testConfig.targetTag]),
		repo.revparse([testConfig.localBranch]),
		repo.log([testConfig.localBranch])
	]);

	expect(initialTargetTagSHA).toBe('c6d732c59ee20379ae9489546c9f8fd32603ecea');
	expect(initialHeadSHA).toBe('d5636e67719df17b89740d6e432e1365cd3baa4b');
	expect(initialLogs.total).toBe(4);

	await patchup.rebaseOnto(testConfig);

	const [finalTargetTagSHA, finalHeadSHA, finalLogs] = await Promise.all([
		repo.revparse([testConfig.targetTag]),
		repo.revparse([testConfig.localBranch]),
		repo.log([testConfig.localBranch])
	]);

	expect(finalTargetTagSHA).not.toBe(initialTargetTagSHA);
	expect(finalHeadSHA).not.toBe(initialHeadSHA);
	expect(finalLogs.total).toBe(6);
});

function optionallyExtractTar(name, done) {
	if (fs.existsSync(`./test-repos/${name}`)) {
		done();
	} else {
		fs.createReadStream(`./test-repos/${name}.tar`)
			.pipe(tar.extract(`./test-repos/${name}/`))
			.on('end', done);
	}
}

async function setupTestRepos() {
	const tarUnpack = promisify(optionallyExtractTar);
	return Promise.all([
		tarUnpack('local'),
		tarUnpack('upstream')
	]);
}
