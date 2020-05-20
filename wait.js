const wait = function (milliseconds) {
	return new Promise((resolve, reject) => { // eslint-disable-line no-unused-vars
		if (typeof (milliseconds) !== 'number') {
			throw new TypeError('milleseconds not a number');
		}

		setTimeout(() => resolve('done!'), milliseconds);
	});
};

module.exports = wait;
