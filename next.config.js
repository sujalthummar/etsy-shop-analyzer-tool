/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase timeout for cron endpoint
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

module.exports = nextConfig;
