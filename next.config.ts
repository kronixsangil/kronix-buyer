import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "host", value: "caseritos\\.kronix\\.co" }],
        destination: "/r/caseritos",
        permanent: false,
      },
      {
        source: "/",
        has: [{ type: "host", value: "3am\\.kronix\\.co" }],
        destination: "/r/3am",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
