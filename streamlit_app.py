from __future__ import annotations

import csv
from datetime import timedelta
from pathlib import Path

import altair as alt
import pandas as pd
import streamlit as st


ROOT = Path(__file__).parent
DATA_DIR = ROOT / "extracted_libsyn"
OVERALL_CSV = DATA_DIR / "Advanced Manufacturing Now.csv"
EPISODE_CSV = DATA_DIR / "Advanced Manufacturing Now- By Episode.csv"


st.set_page_config(
    page_title="Advanced Manufacturing Now Dashboard",
    layout="wide",
)

st.markdown(
    """
    <style>
      .block-container { padding-top: 2rem; padding-bottom: 3rem; }
      h1 { letter-spacing: 0; }
      [data-testid="stMetricValue"] { font-size: 2.05rem; }
      .small-note { color: #68746f; font-size: 0.9rem; margin-top: -0.35rem; }
      .section-note { color: #68746f; font-size: 0.95rem; margin-top: -0.75rem; }
    </style>
    """,
    unsafe_allow_html=True,
)


def _number(value: str | int | float | None) -> int:
    if value is None:
        return 0
    text = str(value).replace(",", "").strip()
    return int(float(text)) if text else 0


@st.cache_data(show_spinner=False)
def load_overall(path: Path) -> tuple[dict[str, int], pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.reader(handle))

    totals = {
        "iab": _number(rows[1][1]),
        "unique": _number(rows[1][2]),
    }

    sections: dict[str, list[dict[str, object]]] = {
        "daily": [],
        "weekly": [],
        "monthly": [],
    }
    active: str | None = None

    for row in rows[2:]:
        if not row:
            continue
        label = row[0]
        if label == "Daily Downloads":
            active = "daily"
        elif label == "Weekly Downloads":
            active = "weekly"
        elif label == "Monthly Downloads":
            active = "monthly"
        elif active and label:
            sections[active].append(
                {
                    "date": label,
                    "iab": _number(row[1] if len(row) > 1 else 0),
                    "unique": _number(row[2] if len(row) > 2 else 0),
                }
            )

    daily = pd.DataFrame(sections["daily"])
    weekly = pd.DataFrame(sections["weekly"])
    monthly = pd.DataFrame(sections["monthly"])

    daily["date"] = pd.to_datetime(daily["date"])
    weekly["date"] = pd.to_datetime(weekly["date"])
    monthly["date"] = pd.to_datetime(monthly["date"] + "-01")

    return (
        totals,
        daily.sort_values("date").reset_index(drop=True),
        weekly.sort_values("date").reset_index(drop=True),
        monthly.sort_values("date").reset_index(drop=True),
    )


@st.cache_data(show_spinner=False)
def load_episodes(path: Path) -> pd.DataFrame:
    episodes = pd.read_csv(path)
    episodes = episodes.rename(
        columns={
            "Title": "title",
            "Release": "release",
            "IAB Downloads": "iab",
            "Unique Downloads": "unique",
        }
    )
    episodes["release"] = pd.to_datetime(episodes["release"])
    episodes["iab"] = pd.to_numeric(episodes["iab"], errors="coerce").fillna(0).astype(int)
    episodes["unique"] = pd.to_numeric(episodes["unique"], errors="coerce").fillna(0).astype(int)
    return episodes.sort_values("release", ascending=False).reset_index(drop=True)


def format_num(value: int | float) -> str:
    return f"{int(value):,}"


def format_date(value: pd.Timestamp) -> str:
    return f"{value:%b} {value.day}, {value:%Y}"


def selected_range(daily: pd.DataFrame, range_label: str) -> pd.DataFrame:
    if range_label == "All time":
        return daily

    days = {
        "Last 90 days": 90,
        "Last 180 days": 180,
        "Last 12 months": 365,
    }[range_label]
    max_date = daily["date"].max()
    min_date = max_date - timedelta(days=days - 1)
    return daily[daily["date"] >= min_date]


def trend_chart(data: pd.DataFrame) -> alt.Chart:
    chart_data = data.melt(
        id_vars="date",
        value_vars=["iab", "unique"],
        var_name="metric",
        value_name="downloads",
    )
    chart_data["metric"] = chart_data["metric"].map(
        {"iab": "IAB Downloads", "unique": "Unique Downloads"}
    )

    return (
        alt.Chart(chart_data)
        .mark_line(point=False, interpolate="monotone")
        .encode(
            x=alt.X(
                "date:T",
                title=None,
                axis=alt.Axis(format="%b %d", labelAngle=0, tickCount=8),
            ),
            y=alt.Y(
                "downloads:Q",
                title="Downloads",
                axis=alt.Axis(format="~s", tickCount=6),
                scale=alt.Scale(zero=True),
            ),
            color=alt.Color(
                "metric:N",
                title=None,
                scale=alt.Scale(
                    domain=["IAB Downloads", "Unique Downloads"],
                    range=["#0f766e", "#c2410c"],
                ),
            ),
            tooltip=[
                alt.Tooltip("date:T", title="Date", format="%b %d, %Y"),
                alt.Tooltip("metric:N", title="Metric"),
                alt.Tooltip("downloads:Q", title="Downloads", format=","),
            ],
        )
        .properties(height=430)
    )


def monthly_chart(data: pd.DataFrame, metric_key: str, metric_name: str) -> alt.Chart:
    chart_data = data.tail(18).copy()
    return (
        alt.Chart(chart_data)
        .mark_bar(cornerRadiusTopLeft=3, cornerRadiusTopRight=3)
        .encode(
            x=alt.X(
                "date:T",
                title=None,
                axis=alt.Axis(format="%b %Y", labelAngle=-35, tickCount=6),
            ),
            y=alt.Y(
                f"{metric_key}:Q",
                title=metric_name,
                axis=alt.Axis(format="~s", tickCount=5),
                scale=alt.Scale(zero=True),
            ),
            color=alt.value("#0f766e" if metric_key == "iab" else "#c2410c"),
            tooltip=[
                alt.Tooltip("date:T", title="Month", format="%b %Y"),
                alt.Tooltip(f"{metric_key}:Q", title=metric_name, format=","),
            ],
        )
        .properties(height=220)
    )


try:
    totals, daily_df, weekly_df, monthly_df = load_overall(OVERALL_CSV)
    episodes_df = load_episodes(EPISODE_CSV)
except FileNotFoundError as exc:
    st.error(f"Could not find the Libsyn export data: {exc}")
    st.stop()


st.caption("Libsyn export")
st.title("Advanced Manufacturing Now")

control_a, control_b, control_c = st.columns([1, 1, 2])
with control_a:
    range_label = st.selectbox(
        "Range",
        ["Last 90 days", "Last 180 days", "Last 12 months", "All time"],
        index=2,
    )
with control_b:
    metric_label = st.selectbox("Metric", ["IAB Downloads", "Unique Downloads"])

metric = "iab" if metric_label == "IAB Downloads" else "unique"
range_df = selected_range(daily_df, range_label)
latest_date = daily_df["date"].max()
first_date = daily_df["date"].min()
latest_release = episodes_df["release"].max()
range_total = int(range_df[metric].sum())
range_average = int(round(range_df[metric].mean())) if not range_df.empty else 0

st.markdown(
    f"<p class='small-note'>Data covers {format_date(first_date)} through {format_date(latest_date)}</p>",
    unsafe_allow_html=True,
)

kpi_1, kpi_2, kpi_3, kpi_4 = st.columns(4)
kpi_1.metric("Total IAB", format_num(totals["iab"]))
kpi_2.metric("Total Unique", format_num(totals["unique"]))
kpi_3.metric(f"{range_label} {metric_label}", format_num(range_total), f"{format_num(range_average)} per day")
kpi_4.metric("Episodes", format_num(len(episodes_df)), f"Latest: {format_date(latest_release)}")

st.divider()

trend_col, side_col = st.columns([1.65, 1])
with trend_col:
    st.subheader("Download Trend")
    st.markdown(
        f"<p class='section-note'>Daily downloads for {range_label.lower()}</p>",
        unsafe_allow_html=True,
    )
    st.altair_chart(trend_chart(range_df), use_container_width=True)

with side_col:
    st.subheader("Monthly Momentum")
    st.markdown("<p class='section-note'>Most recent 18 months</p>", unsafe_allow_html=True)
    st.altair_chart(monthly_chart(monthly_df, metric, metric_label), use_container_width=True)

    st.subheader("Best Weeks")
    st.markdown("<p class='section-note'>Peak weekly totals</p>", unsafe_allow_html=True)
    top_weeks = weekly_df.nlargest(10, metric).copy()
    top_weeks["week"] = top_weeks["date"].dt.strftime("%Y-%m-%d")
    st.dataframe(
        top_weeks[["week", metric]].rename(columns={"week": "Week", metric: metric_label}),
        hide_index=True,
        use_container_width=True,
        height=260,
    )

st.divider()

top_col, table_col = st.columns([1, 1.35])
with top_col:
    st.subheader("Top Episodes")
    st.markdown("<p class='section-note'>Sorted by selected metric</p>", unsafe_allow_html=True)
    top_episodes = episodes_df.nlargest(12, metric).copy()
    top_episodes["Release"] = top_episodes["release"].dt.strftime("%b %d, %Y")
    st.dataframe(
        top_episodes[["title", "Release", metric]].rename(
            columns={"title": "Title", metric: metric_label}
        ),
        hide_index=True,
        use_container_width=True,
        height=480,
    )

with table_col:
    st.subheader("Episode Table")
    query = st.text_input("Search episodes", placeholder="Search titles or years")
    filtered = episodes_df
    if query:
        haystack = episodes_df["title"].str.cat(episodes_df["release"].dt.strftime("%Y-%m-%d"), sep=" ")
        filtered = episodes_df[haystack.str.contains(query, case=False, regex=False, na=False)]

    table = filtered.copy()
    table["Release"] = table["release"].dt.strftime("%b %d, %Y")
    st.dataframe(
        table[["title", "Release", "iab", "unique"]].rename(
            columns={
                "title": "Title",
                "iab": "IAB Downloads",
                "unique": "Unique Downloads",
            }
        ),
        hide_index=True,
        use_container_width=True,
        height=520,
    )
