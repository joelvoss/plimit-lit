module.exports = {
	presets: [
		[
			'@jvdx/babel-preset',
			{
				'preset-env': {
					targets: { node: 12 },
				},
			},
		],
	],
};
