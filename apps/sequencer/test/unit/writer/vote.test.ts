describe('writer/vote', () => {
  describe('verify()', () => {
    it.todo('rejects if the schema is invalid');
    it.todo('rejects if the proposal is not found');
    it.todo('rejects if the voting window is invalid');

    describe('when shutter is enabled', () => {
      it.todo('rejects if passing a reason');
      it.todo('rejects if the choices are invalid');
    });

    describe('when the proposal is shutter-elgamal', () => {
      // The rule itself is covered in test/unit/helpers/te.test.ts, including
      // parity with the hub feed's rounding. What is untested is the wiring:
      // that verify() applies it, and only for shutter-elgamal.
      it.todo('rejects voting power below 0.5');
      it.todo('rejects a vote timestamped exactly at proposal.end');
      it.todo(
        'accepts a vote timestamped at proposal.end on a public proposal'
      );
      it.todo('does not apply the floor to non-private proposals');
    });

    it.todo('rejects when the choice is invalid');
    it.todo('rejects when if fails <snapshot SDK vote validation>');
    it.todo('rejects when if fails to check validation with snapshot SDK');
  });
});
