# Advanced Manufacturing Now Podcast Dashboard

This dashboard summarizes performance for the **Advanced Manufacturing Now** podcast using Libsyn export files. It is intended for routine use in a web browser.

## Important Links

- [Open the dashboard](https://smepodcastdash.streamlit.app/)
- [SMEMedia repository](https://github.com/SMEMedia/PodcastDash)

## What The Dashboard Shows

- Total podcast downloads
- Daily download trends
- Monthly performance
- Highest-performing weeks
- Top episodes
- A searchable episode table

## Updating The Data

The dashboard can use the saved Libsyn files already included with the app, or you can drag in updated CSV files.

To use updated data:

1. Open the dashboard.
2. Open **Update the dashboard data**.
3. Drag in the overall Libsyn stats CSV.
4. Drag in the Libsyn **By Episode** CSV.
5. Review the updated charts and tables.

The uploaded files are used for that dashboard session. They do not change information in Libsyn.

## Using The Filters

The **Range** filter changes the time period shown across the dashboard, including the trend chart, monthly totals, best weeks, top episodes, and episode table.

The **Metric** filter switches between:

- **IAB Downloads**, the standard podcast download measurement
- **Unique Downloads**, a more listener-focused download count

## Troubleshooting

### The newest episode is missing

- Confirm the episode is included in the latest Libsyn export used by the dashboard.
- Check whether the episode title or release date differs from what you expected.
- Allow time for Libsyn to record and finalize recent downloads.
- If the source export is current but the episode is still missing, send the episode title and release date to the dashboard support contact.

### Download totals do not match another report

- Confirm both reports cover the same date range.
- Confirm both reports use the same Libsyn download definition.
- Check when each report was exported; recent totals may continue to change.
- Record the two totals, date range, and export dates before escalating.

### A chart or table is empty

- Try a wider date range.
- Clear any search text or filters.
- Refresh the browser once.
- Confirm both expected CSV files were uploaded, if using updated data.
- If the entire dashboard is empty, ask the dashboard owner to confirm that the current Libsyn export is available to the app.

### The dashboard will not open

- Confirm you are using the live dashboard link above.
- Try again in a private browser window to rule out a stale session.
- Check [Streamlit Community Cloud](https://share.streamlit.io/) for an app status message.
- Send a screenshot and the approximate time of the error to the dashboard support contact.

## Ongoing Maintenance

- Export updated Libsyn CSV files when a new reporting period is required.
- Use the dashboard upload area for quick review of new exports.
- Replace the saved source files in the repository only when the default dashboard data should change for everyone.
- Keep Streamlit and repository access assigned to current SME staff.
- Escalate source-file, deployment, or code changes to the assigned technical owner.
