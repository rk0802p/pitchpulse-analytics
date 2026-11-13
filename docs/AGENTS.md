# Contributor Instructions

These instructions apply to the entire PitchPulse Analytics repository.

A change is ready for review only when its behavior has been verified, the relevant tests have passed, and the final diff has been inspected.

PitchPulse Analytics is a sports analytics platform focused on historical performance, statistical analysis, player and team metrics, match predictions, and reliable data visualization. Changes must preserve statistical correctness, data integrity, and consistency between the backend, analytical pipelines, and frontend.

## Understand the change before editing

- Read `README.md`, the relevant project documentation, and the code and tests associated with the requested change first.
- Start from the latest upstream `main` on a branch dedicated to one task.
- Inspect the working tree before editing. Preserve unrelated work and existing user changes.
- Identify the complete execution path before changing behavior. Search the repository for every caller, consumer, API endpoint, data transformation, and test affected by the change.
- Identify whether the issue originates in data ingestion, preprocessing, feature engineering, metric calculation, prediction logic, API serialization, frontend formatting, or visualization.
- Explain the current failure and intended behavior using a concrete example.
- If a statistical definition, data-source behavior, or cricket rule is uncertain, consult existing documentation and authoritative evidence. Report uncertainty instead of inventing assumptions.
- Identify the source of truth for each metric, dataset, feature, and configuration before modifying it.
- Check existing project conventions, dependencies, configuration, and test structure before introducing new patterns.

## Preserve analytical correctness

PitchPulse Analytics must represent actual data and calculated results accurately.

- Never fabricate historical match records, player statistics, team results, venue information, or model evaluation results.
- Do not silently replace missing values with zero, averages, arbitrary defaults, or fabricated historical observations.
- Preserve the distinction between:
  - A genuine zero.
  - Missing or unavailable data.
  - An invalid value.
  - A value that has not yet been calculated.
- Use `null`, `NaN`, or the project's existing missing-value representation consistently with the relevant pipeline and consumer.
- Do not convert missing historical tracking data into zero-valued observations.
- Preserve the existing behavior for incomplete records unless the task explicitly requires changing it.
- Verify that missing values remain correctly represented through ingestion, preprocessing, calculations, API responses, frontend rendering, and comparisons.
- Check whether missing values affect sorting, rankings, averages, charts, model inputs, or statistical summaries.
- Ensure that a player or team with incomplete data is not incorrectly ranked as having the worst performance or a zero score.
- Do not silently discard invalid records or suppress data-quality problems.
- Keep data-quality validation separate from legitimate analytical calculations.

## Protect statistical calculations and metrics

Before changing a metric, identify its definition, inputs, units, aggregation method, and intended interpretation.

- Reuse existing metric implementations and shared calculation helpers.
- Do not duplicate formulas in different parts of the application.
- Do not change a metric's definition, weighting, normalization, denominator, or aggregation method unless the task explicitly requires it.
- Keep type annotations, input values, intermediate calculations, outputs, API schemas, and frontend consumers consistent.
- Check edge cases involving zero denominators, missing observations, small sample sizes, incomplete seasons, duplicate records, and invalid numeric values.
- Ensure calculations do not produce unhandled `NaN`, infinity, or misleading results.
- Preserve the distinction between raw statistics, derived metrics, normalized scores, and model predictions.
- Verify that displayed percentages, averages, rates, rankings, and scores use the correct units and precision.
- Do not round intermediate calculations unless the existing metric definition requires it.
- Do not change historical results unintentionally when modifying a shared calculation.
- If a metric is intentionally changed, document the old and new definitions and verify the resulting outputs against known examples.

For workload, fatigue, form, clutch performance, win probability, and similar derived metrics:

- Verify the exact input records used.
- Confirm that chronological ordering is correct where the calculation depends on time.
- Check that the observation window and aggregation rules match the documented definition.
- Verify that missing matches or player appearances do not introduce artificial observations.
- Do not describe a statistical score as a medical diagnosis, confirmed injury risk, or guaranteed outcome.
- Distinguish descriptive statistics from predictive estimates.
- Avoid presenting model outputs as certainty.

## Prevent data leakage in historical analysis

Any change involving historical features, rolling statistics, training data, predictions, or model evaluation must explicitly check for temporal leakage.

- Identify the prediction target and the exact point in time at which the prediction is intended to be made.
- Confirm that every input feature would have been available at that prediction time.
- Construct historical features using only information available before the corresponding prediction.
- Do not use the result of a match to calculate a feature used to predict that same match.
- Do not use future matches when calculating historical team form, player form, head-to-head statistics, venue tendencies, or rolling averages.
- Update historical state only after the current observation has been processed.
- Verify chronological sorting and the handling of matches with identical dates or timestamps.
- Check whether preprocessing, normalization, imputation, feature selection, or model fitting accidentally uses evaluation data.
- Keep training, validation, and test data separated according to the project's evaluation strategy.
- Do not shuffle chronological data when doing so would invalidate the intended temporal evaluation.
- When changing feature engineering, inspect the complete feature-generation path rather than only the final model.
- Add regression tests that demonstrate that future information cannot affect an earlier prediction.

A passing model test is not sufficient if the feature-generation process contains leakage.

## Keep changes focused

- Fix the requested behavior without unrelated cleanup, formatting changes, refactoring, or redesign.
- Reuse existing data loaders, validation helpers, metric functions, formatting utilities, and API conventions.
- Do not change a shared helper to fix one metric or endpoint unless the new behavior is intended and tested for every consumer.
- Preserve existing API contracts, endpoint names, response structures, defaults, error handling, sorting, filtering, pagination, and frontend expectations unless the task explicitly requires a change.
- Keep backend schemas, model outputs, serialized values, frontend types, and UI consumers consistent.
- If a field changes type, check every location that creates, reads, compares, transforms, serializes, or displays it.
- If a response changes, identify all frontend components and other consumers that depend on it.
- Import every new dependency explicitly.
- Compilation alone does not detect undefined names inside unexecuted functions. Execute the changed code path in a test.
- Catch expected input and data-validation errors at the appropriate boundary.
- Do not hide programming errors with broad exception handlers.
- Do not silently return empty results, fabricated defaults, or unrelated records when parsing or calculation fails.
- Do not add dependencies or change configuration, storage schemas, deployment files, environment variables, or external service permissions unless the task requires it.
- Avoid changing public interfaces or compatibility behavior for unrelated functionality.

## Protect shared application behavior

PitchPulse Analytics contains interconnected data, analytical, API, and frontend workflows.

Before changing shared code, search for its consumers and verify the impact on:

- Data ingestion and source adapters.
- Historical match and player datasets.
- Data cleaning and validation.
- Feature engineering and rolling calculations.
- Player and team statistics.
- Workload, fatigue, form, and performance metrics.
- Model training, prediction, and evaluation.
- Backend API routes and response schemas.
- Frontend data fetching and state management.
- Metric formatting, sorting, filtering, and comparison.
- Tables, rankings, charts, and dashboards.
- Historical tracking and missing-value handling.
- Tests, fixtures, and data-quality checks.

A change to a shared data loader, metric formatter, comparator, or feature builder can affect several dashboards and analytical workflows.

Do not validate a shared change using only one screen or one endpoint.

For data-processing and metric changes, cover the relevant cases:

- A valid complete record.
- A valid record containing genuine zero values.
- Missing optional fields.
- Missing historical observations.
- Empty datasets.
- Duplicate records.
- Invalid or malformed values.
- `null`, `NaN`, and infinity where applicable.
- A player or team with insufficient observations.
- Multiple seasons and chronological boundaries.
- Records with different date formats or missing timestamps.
- Sorting and comparison with incomplete data.
- Combined filters and pagination where applicable.
- API serialization and frontend rendering.
- No filter or no optional parameter: preserve existing behavior.
- Invalid input: preserve the intended restriction and return the appropriate error.

Use the existing source of truth for metric definitions, datasets, configuration, and validation rules. Do not introduce hardcoded copies of existing data or metric definitions.

Verify that invalid or missing inputs cannot silently produce misleading rankings, predictions, scores, or visualizations.

## Protect frontend and visualization behavior

Changes to the frontend must preserve the relationship between displayed values and their underlying analytical results.

- Read the relevant components, API clients, formatters, state management, and tests before editing.
- Identify whether a displayed value is raw data, a derived metric, or a model prediction.
- Reuse existing formatting and missing-value utilities.
- Do not introduce arbitrary placeholder statistics or hardcoded chart values.
- Do not convert missing values into zero merely to make a chart render.
- Preserve existing loading, error, empty-data, and unavailable-data states.
- Check that charts, tables, cards, rankings, and comparisons handle missing or invalid values correctly.
- Ensure that labels, units, percentages, date ranges, and precision match the underlying metric.
- Check that sorting and ranking use the intended numerical values rather than formatted strings.
- Verify that frontend calculations do not contradict backend calculations.
- Avoid duplicating analytical logic in frontend components.
- Preserve existing responsive behavior, navigation, accessibility, and visual design unless the task explicitly requests a UI change.
- Do not redesign unrelated components or change the theme as part of a data or backend fix.
- If a frontend change affects shared formatting or comparison behavior, test all relevant consumers.

A chart that renders successfully does not prove that its values are correct.

## Test the behavior before opening a pull request

For executable behavior changes:

1. Add a regression test for the actual bug or requested behavior.
2. For a bug fix, confirm that the regression test fails against the old implementation for the expected reason and passes with the fix.
3. Assert concrete outputs, metric values, selected records, API responses, errors, or state changes. A test that merely checks that a function executes is insufficient.
4. Use isolated fixtures, temporary data, mocked external services, and deterministic test inputs.
5. Tests must not connect to production data sources, use live credentials, start a live service, or depend on external API availability unless the test explicitly requires an isolated integration environment.
6. Run the relevant existing tests as well as the new regression test.
7. If changing a shared data loader, metric, feature builder, API contract, or model evaluation path, run the full relevant test suite.
8. Investigate failures. Do not delete, skip, or weaken assertions merely to make the suite pass.
9. Verify that tests cover the intended behavior, not only implementation details.
10. Review the complete diff and run the repository's whitespace and formatting checks before submitting.

## Verify the analytical result

For changes involving data, metrics, or models:

- Compare the result against a known fixture or independently verified example.
- Verify the input records and intermediate calculations.
- Check the result for expected units, range, and interpretation.
- Confirm that missing data is handled according to the existing contract.
- Verify that the change does not introduce temporal leakage.
- Compare before-and-after outputs for representative historical records.
- Investigate unexpected changes to unrelated metrics or historical results.
- Confirm that model evaluation uses the intended split and baseline.
- Report actual evaluation results rather than estimated or assumed improvements.

Do not claim that a model is more accurate, a metric is more reliable, or a dataset is complete without evidence from the relevant checks.

## Run the repository's actual checks

Run commands from the repository root using the project's documented environment.

First inspect:

- `README.md`
- `pyproject.toml`, `requirements.txt`, or the relevant dependency files.
- Frontend `package.json` files.
- Existing test configuration.
- CI workflows under `.github/workflows/`.
- Relevant project-specific test and verification scripts.

Use the project's documented commands rather than assuming that a particular test runner or module layout exists.

Typical Python checks, if supported by the current project:

```powershell
# Run the relevant test module
.venv\Scripts\python.exe -m pytest tests/<relevant_test_file>.py -q

# Run the relevant test directory
.venv\Scripts\python.exe -m pytest tests/ -q

# Run the complete Python test suite
.venv\Scripts\python.exe -m pytest -q
```

Typical frontend checks, if supported by the current project:

```powershell
# Run frontend tests
npm test

# Run the production build
npm run build

# Run linting when configured
npm run lint
```

If the repository uses different commands, use the actual commands defined by its scripts and CI configuration.

Before submitting:

```powershell
git diff --check
git diff
git status --short
```

Verify the exact test names, paths, and commands against the current checkout. These examples are not a substitute for identifying the actual impact of the change.

On other platforms, use the appropriate virtual environment executable and shell syntax.

Never claim tests passed unless you ran them on the final version of the change.

After editing code again, rerun the affected checks. If a required check cannot run, state the exact limitation and leave the change unready for merge.

## Review the final diff for privacy and accidental changes

- Keep API keys, tokens, filled environment files, credentials, connection strings, private datasets, and local configuration out of Git.
- Never expose production player data, private user information, account details, or sensitive external API responses in fixtures, screenshots, logs, or documentation.
- Use synthetic examples and neutral placeholders.
- Check new fixtures, screenshots, logs, notebooks, and generated files for private account details, identifying paths, network addresses, credentials, and unnecessary dataset copies.
- Do not commit local databases, cached API responses, downloaded datasets, model artifacts, recordings, or generated runtime output unless explicitly required.
- Do not commit temporary analysis files, debugging output, or unrelated changes.
- Stage specific files and inspect `git diff --cached` before committing.
- Remove unrelated files and generated artifacts from the staged change.
- Do not start a live service, deploy, merge, or publish changes as part of a code edit unless the repository owner explicitly authorizes that action.

## Make the pull request verifiable

Describe:

- The problem and its root cause.
- The affected data pipeline, metric, API, model, or frontend behavior.
- The resulting behavior and why it is correct.
- A concrete before-and-after example.
- The relevant metric definition or data assumptions, if applicable.
- The exact test commands run and their results.
- Any analytical validation or model evaluation performed.
- Any remaining limitations, unavailable data, or unresolved uncertainty.

Keep the pull request title and description aligned with the final diff.

Do not describe a metric change as a harmless refactor if its output or interpretation changes.

Do not claim that historical data, model predictions, or analytical results are correct merely because the application builds or the dashboard renders.

## Final review requirements

A change is not ready for review if any of the following apply:

- The root cause has not been identified.
- The affected callers or consumers have not been checked.
- A changed analytical calculation has no concrete expected-output test.
- Missing values are incorrectly converted into valid observations.
- A historical feature uses information unavailable at prediction time.
- A shared helper changes behavior without testing its other consumers.
- A frontend component displays fabricated, stale, or incorrectly formatted data.
- An API response changes without checking its consumers.
- A required test or verification check has not been run.
- A test failure is unexplained or an assertion has been weakened.
- The final diff contains unrelated changes, private data, credentials, or generated artifacts.
- The final implementation has not been rechecked after its last edit.

Stop, fix, and verify these issues before requesting review.

**The goal is not merely to make PitchPulse Analytics run. The goal is to ensure that every change preserves data integrity, statistical correctness, temporal validity, and trustworthy presentation of analytical results.**