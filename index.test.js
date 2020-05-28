/* eslint-env jest */
const wait = require('./wait');
const cp = require('child_process');
const path = require('path');

test('throws invalid number', async () => {
	await expect(wait('foo')).rejects.toThrow('milleseconds not a number');
});

test('wait 500 ms', async () => {
	const start = new Date();
	await wait(500);
	const end = new Date();
	const delta = Math.abs(end - start);
	expect(delta).toBeGreaterThan(450);
});

// Shows how the runner will run a javascript action with env / stdout protocol
test('test runs', () => {
	const env = Object.create(process.env);
	env.INPUT_LOCAL_BRANCH = 'master';
	env.INPUT_UPSTREAM_REPO = 'upstream';
	env.INPUT_UPSTREAM_BRANCH = 'master';
	env.INPUT_STRATEGY = 'merge';
	const ip = path.join(__dirname, 'index.js');
	console.log(cp.execSync(`${process.execPath} ${ip}`, {env}).toString());
});
