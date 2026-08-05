# PodcastDash

Streamlit dashboard for the Advanced Manufacturing Now Libsyn export.

## Run locally

```powershell
pip install -r requirements.txt
streamlit run streamlit_app.py
```

The app reads the CSV files in `extracted_libsyn/` and provides:

- Summary download KPIs
- Daily trend with readable date axes
- Monthly momentum
- Best weeks
- Top episodes
- Searchable episode table
