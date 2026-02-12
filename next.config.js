/** @type {import('next').NextConfig} */
const nextConfig = {
    /* config options here */
    experimental: {
        // serverActions: true, // Not needed for Next 15 as it's default
    },
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.externals.push({
                'sharp': 'commonjs sharp',
                'jimp': 'commonjs jimp',
                'bufferutil': 'commonjs bufferutil',
                'utf-8-validate': 'commonjs utf-8-validate',
                '@whiskeysockets/baileys': 'commonjs @whiskeysockets/baileys'
            });
        }
        return config;
    },
};

module.exports = nextConfig;
