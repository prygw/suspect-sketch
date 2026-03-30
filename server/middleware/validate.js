function validateSessionExists(sessionService) {
  return (req, res, next) => {
    const session = sessionService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    req.session = session;
    next();
  };
}

module.exports = { validateSessionExists };
