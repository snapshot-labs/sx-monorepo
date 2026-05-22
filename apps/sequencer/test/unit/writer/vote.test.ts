describe('writer/vote', () => {
  describe('verify()', () => {
    it.todo('rejects if the schema is invalid');
    it.todo('rejects if the proposal is not found');
    it.todo('rejects if the voting window is invalid');

    describe('when shutter is enabled', () => {
      it.todo('rejects if passing a reason');
      it.todo('rejects if the choices are invalid');
    });

    it.todo('rejects when the choice is invalid');
    it.todo('rejects when if fails <snapshot SDK vote validation>');
    it.todo('rejects when if fails to check validation with snapshot SDK');
  });
});
