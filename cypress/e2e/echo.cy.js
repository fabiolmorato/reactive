describe("echo page", () => {
  it("should bind the input text to the text below", () => {
    cy.open("echo");

    cy.contains("Type something up there :)").should("be.visible");
    cy.testId("bind-input").type("Hello, World!");
    cy.contains(`You typed "Hello, World!"`).should("be.visible");
  });
});
