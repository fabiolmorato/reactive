describe("increment page", () => {
  it("should update the counter message after clicking the button", () => {
    cy.open("increment");

    cy.contains("You clicked 0 times!").should("be.visible");
    cy.contains("Click me").should("be.visible");
    cy.contains("Click me").click();

    cy.contains("You clicked 1 times!").should("be.visible");
  });

  it("should increment to 11 and then show the wow message", () => {
    cy.open("increment");

    cy.contains("You clicked 0 times!").should("be.visible");
    cy.contains("Click me").should("be.visible");

    for (let i = 0; i < 10; i++) {
      cy.contains("Click me").click();
    }

    cy.contains("You clicked 10 times!").should("be.visible");
    cy.contains("WOW! So many clicks!").should("not.exist");
    cy.contains("Click me").click();
    cy.contains("You clicked 11 times! WOW! So many clicks!").should("be.visible");
  });

  it("should display an alert message after clicking the button more than 15 times", () => {
    cy.open("increment");

    cy.contains("You clicked 0 times!").should("be.visible");
    cy.contains("Click me").should("be.visible");

    for (let i = 0; i < 15; i++) {
      cy.contains("Click me").click();
    }

    cy.contains("You clicked 15 times!").should("be.visible");
    cy.contains("Click me").click();
    cy.contains("You clicked 16 times! WOW! So many clicks!").should("be.visible");
    cy.on("window:alert", (alertMessage) => {
      expect(alertMessage).to.equal("Woah, calm down!");
    });
  });
});
