const ADS_TXT = "google.com, pub-8826344657583237, DIRECT, f08c47fec0942fa0";

export function GET() {
  return new Response(ADS_TXT, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
