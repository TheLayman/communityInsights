import axios from "axios";

export async function fetchStackPosts(
  tag = "microsoft-teams",   // or "teamsfx" or any tag you prefer
  hours = 24,
  pageSize = 1
) {
  const fromDate = Math.floor(Date.now() / 1000) - hours * 7200;
  const res = await axios.get("https://api.stackexchange.com/2.3/questions", {
    params: {
      site: "stackoverflow",
      tagged: tag,
      sort: "creation",     // ← get the newest ones
      order: "desc",
      fromdate: fromDate,   // still limit to last `hours`
      pagesize: pageSize,
      filter: "withbody", // ← remove this for now
    },
  });

  return res.data.items.map((q: any) => (
    {
    id: `so-${q.question_id}`,
    source: "stackoverflow",
    url: q.link,
    // if you need the body, you can request a custom filter later:
    text: `${q.title}\n\n${q.body_markdown ?? q.body ?? ""}`
  }));
}
