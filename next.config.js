const path = require('path');
const { NextFederationPlugin } = require('@module-federation/nextjs-mf');

/** @type {import("next").NextConfig} */
const nextConfig = {
    reactStrictMode: process.env.NODE_ENV !== 'development',
    sassOptions: {
        includePaths: [path.join(__dirname, 'styles')],
    },
    webpack(config, { isServer }) {
        // Add source maps for sass-loader
        config.module.rules.forEach(rule => {
            if (Array.isArray(rule.oneOf)) {
                rule.oneOf.forEach(oneOf => {
                    if (oneOf.use) {
                        oneOf.use.forEach(use => {
                            if (use.loader && use.loader.includes('sass-loader')) {
                                use.options.sourceMap = true;
                            }
                        });
                    }
                });
            }
        });

        // NextFederationPlugin configuration
        config.plugins.push(
            new NextFederationPlugin({
                name: 'microContentBuilder',
                filename: 'static/chunks/remoteEntry.js',
                exposes: {
                    './EbBuilderComponent': './components/eb-builder/index.tsx',
                    './EbContactUsComponent': './components/eb-contact-us/index.tsx',
                },
                shared: {
                    // Define shared dependencies
                },
            }),
        );

        return config;
    },
};

module.exports = nextConfig;
