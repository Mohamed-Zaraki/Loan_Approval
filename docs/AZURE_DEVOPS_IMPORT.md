# Import the LoanFlow backlog into Azure DevOps

The companion [CSV backlog](AZURE_DEVOPS_BACKLOG.csv) contains a parent-child hierarchy:

```text
Feature: Frontend — Presentation Layer
  User Story: View and Review Loan Applak: Build the manager review queue…
    Task: Implement the review drawer…
  User Story: Submit Loan Application
    Task: Implement the submit flow…
    Task: Build the confirmation screen…
  User Story: Enter Applicant and Loan Information
    Task: Implement the applicant step…
    Task: Implement the finances and loan-term steps…
  User Story: Display Loan Application Form
    Task: Build the responsive three-step form…
    Task: Implement reusable field controls…
```

Import it from **Boards → Queries → Import work items**, choose `AZURE_DEVOPS_BACKLOG.csv`, review
the hierarchy, then save the imported items. The CSV uses Azure Boards' `Title 1`, `Title 2`, and
`Title 3` columns to create parent-child links. [Microsoft's CSV import guide](https://learn.microsoft.com/en-us/azure/devops/boards/queries/import-work-items-from-csv?view=azure-devops)
documents this import flow.

This file uses the **Agile** work item type `User Story`. If your project uses the Scrum process,
replace `User Story` with `Product Backlog Item` in the CSV before importing. Work item types vary
by process template.
