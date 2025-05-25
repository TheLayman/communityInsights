import axios from "axios";

export async function fetchStackPosts(
  tag = "microsoft-teams",   // or "teamsfx" or any tag you prefer
  hours = 24,
  pageSize = 1
) {
  // Compute the fromDate in seconds. Previously this used 7200 which
  // effectively doubled the desired timeframe (hours * 2 hours).
  // Use 3600 seconds per hour to correctly limit the results to the
  // specified number of hours.
  const fromDate = Math.floor(Date.now() / 1000) - hours * 3600;
  const res = await axios.get("https://api.stackexchange.com/2.3/questions", {
    params: {
      site: "stackoverflow",
      tagged: tag,
      sort: "creation",     // ← get the newest ones
      order: "desc",
      fromdate: fromDate,   // still limit to last `hours`
      pagesize: pageSize,
      filter: "withbody", 
    },
  });

  return res.data.items.map((q: any) => (
    {
    id: `so-${q.question_id}`,
    source: "stackoverflow",
    url: q.link,
    text: q.title,
    // text: `${q.title}\n\n${q.body_markdown ?? q.body ?? ""}`
  }));
}
