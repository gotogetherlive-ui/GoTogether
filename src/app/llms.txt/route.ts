import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-static";

export function GET() {
  const body = `# GoTogether

> GoTogether is an India-focused marketplace for discovering public group trips and verified travel organizers.

## Find trips

- [Browse group trips](${absoluteUrl("/trips")}): Compare currently published trips by destination, dates, duration, price, and organizer.
- [Explore destinations](${absoluteUrl("/destinations")}): Browse destination hubs and connect to available public trip inventory.
- [Travel organizers](${absoluteUrl("/organizers")}): Review public organizer profiles and the live trips they operate.

## Trust and safety

- [How organizer verification works](${absoluteUrl("/verified-organizers")}): Understand GoTogether's organizer review and verification process.
- [Travel safety](${absoluteUrl("/safety")}): Read safety guidance for travelers using the marketplace.
- [Cancellation policy](${absoluteUrl("/cancellation-policy")}): Review cancellation rules before booking.
- [Refund policy](${absoluteUrl("/refund-policy")}): Understand refund eligibility and processing.

## Travel guidance

- [Group travel guides](${absoluteUrl("/guides")}): Practical starting points for comparing group trips and preparing to travel.
- [How GoTogether works](${absoluteUrl("/how-it-works")}): Learn how discovery, comparison, organizer checks, and booking fit together.

## Support

- [Contact GoTogether](${absoluteUrl("/contact")}): Get help with marketplace, trip, organizer, booking, or safety questions.
- [About GoTogether](${absoluteUrl("/about")}): Read about the marketplace and its purpose.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
