/* eslint-env jest */
const wait = require('./wait');
const config = require('config');
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
	config.env.INPUT_MILLISECONDS = 500;
	const ip = path.join(__dirname, 'index.js');
	console.log(cp.execSync(`node ${ip}`).toString());
});
