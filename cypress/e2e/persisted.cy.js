describe("persisted page", () => {
  it("should bind the input text to the text below", () => {
    cy.open("persisted");

    cy.contains("Input your username above").should("be.visible");
    cy.testId("bind-input").type("awesomeUser42");
    cy.contains("Welcome back, awesomeUser42").should("be.visible");
  });

  it("should keep the username in the input field after a page refresh", () => {
    cy.open("persisted");

    cy.contains("Input your username above").should("be.visible");
    cy.testId("bind-input").type("awesomeUser42");
    cy.contains("Welcome back, awesomeUser42").should("be.visible");

    cy.reload();
    cy.testId("bind-input").should("have.value", "awesomeUser42");
    cy.contains("Welcome back, awesomeUser42").should("be.visible");
  });
});

