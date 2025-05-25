import { Octokit } from "@octokit/rest";
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function fetchGitHubIssues(
owner = "OfficeDev",
repo  = "microsoft-teams-library-js",
  perPage = 1
) {
  const { data } = await octokit.rest.issues.listForRepo({
    owner,
    repo,
    state: "open",
    per_page: perPage,
  });
  return data.map((issue) => ({
    id: `gh-${issue.id}`,
    source: "github",
    url: issue.html_url!,
    text:issue.title,
    // text: issue.title + "\n\n" + (issue.body || ""),
  }));
}
