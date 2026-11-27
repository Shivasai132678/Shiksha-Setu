# Shiksha Setu

Shiva Sai Vemula · Veltris Vertical AI Academy · Challenge A

The [main report](Main-Report.pdf) (13 pages, within the 15-page limit) follows all ten mandatory requirements on page 11 of the brief and addresses Challenge A Tasks A–G.

| Required item | Report pages |
|---|---:|
| 1. Executive summary (maximum 2 pages) | 1–2 |
| 2. Problem statement and prioritization (Task A) | 3 |
| 3. Data analysis and supporting calculations (Task B) | 4–5 |
| 4. Proposed AI solution & prioritization model (Tasks C & D) | 6–7 |
| 5. Technical architecture (Task E) | 8 |
| 6. Prototype or practical artifact (Task G) | 9 |
| 7. Impact measurement framework (Task F) | 10 |
| 8. Risks, assumptions and limitations | 11 |
| 9. A 90-day implementation roadmap | 12 |
| 10. Personal reflection | 13 |

## Supporting files

- [Worked Python notebook](analysis/Attendance-Analysis.ipynb) with saved outputs, plus the A1/A2 CSVs and command-line script (`analysis/analyze.py`).
- [Technical architecture (PDF)](architecture/Architecture.pdf) and [high-resolution PNG](architecture/Architecture.png).
- [Working demo](prototype/index.html). Open in a browser and choose **Open district desk**.
- [Eight-slide presentation (PowerPoint)](Shiksha-Setu-Presentation.pptx) and [matching presentation PDF](Shiksha-Setu-Presentation.pdf).
- [One-page AI usage declaration](AI-Usage-Declaration.pdf).

## Reproducibility

From the submission folder, run `python3 analysis/analyze.py` (Python 3.10+) to reproduce all A1–A3 calculations and `python3 prototype/tests/test_risk_engine.py` to verify the scoring and allocation unit tests (6/6 passing).
