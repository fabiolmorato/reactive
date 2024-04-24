describe("tic tac toe page", () => {
  it("should show first move as being X's", () => {
    cy.open("tic-tac-toe");
    cy.contains("X's turn").should("be.visible");
  });

  it("should show a tic tac toe empty board when the page is loaded", () => {
    cy.open("tic-tac-toe");

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        cy.testId(`board-cell-${i}-${j}`).should("be.visible");
        cy.testId(`board-cell-${i}-${j}`).should("have.text", "_");
      }
    }
  });

  it("should update the player turn information after a move is made", () => {
    cy.open("tic-tac-toe");

    cy.contains("X's turn").should("be.visible");
    cy.testId("board-cell-0-0").click();
    cy.contains("O's turn").should("be.visible");
  });
  
  it("should update the clicked cell with the player's symbol", () => {
    cy.open("tic-tac-toe");

    cy.testId("board-cell-0-0").click();
    cy.testId("board-cell-0-0").should("have.text", "X");
  });

  it("should continuously update the player turn information after each move", () => {
    cy.open("tic-tac-toe");
    let currentTurn = "X";

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        cy.testId(`board-cell-${i}-${j}`).click();
        currentTurn = currentTurn === "X" ? "O" : "X";
        cy.contains(`${currentTurn}'s turn`).should("be.visible");
      }
    }
  });

  it("should continuously update the clicked cell with the player's symbol after each move", () => {
    cy.open("tic-tac-toe");
    let currentTurn = "X";

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        cy.testId(`board-cell-${i}-${j}`).click();
        cy.testId(`board-cell-${i}-${j}`).should("have.text", currentTurn);
        currentTurn = currentTurn === "X" ? "O" : "X";
      }
    }
  });

  it("should not allow a player to click on a cell that has already been clicked", () => {
    cy.open("tic-tac-toe");

    cy.testId("board-cell-0-0").click();
    cy.testId("board-cell-0-0").click();
    cy.contains("O's turn").should("be.visible");
    cy.testId("board-cell-0-0").should("have.text", "X");
  });
});

