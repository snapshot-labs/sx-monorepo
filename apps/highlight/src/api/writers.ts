import { z } from 'zod';
import { Writer } from './indexer/types';
import {
  Alias,
  Discussion,
  Role,
  Statement,
  User,
  UserRole,
  Vote
} from '../../.checkpoint/models';

const SetAliasEventData = z.tuple([
  z.string(), // from
  z.string(), // to
  z.string() // salt
]);

const NewDiscussionEventData = z.tuple([
  z.number(), // id
  z.string(), // author
  z.string(), // title
  z.string(), // body
  z.string() // discussionUrl
]);

const CloseDiscussionEventData = z.tuple([
  z.number() // id
]);

const NewStatementEventData = z.tuple([
  z.number(), // id
  z.string(), // author
  z.number(), // discussionId
  z.string() // body
]);

const PinStatementEventData = z.tuple([
  z.number(), // discussionId
  z.number() // statementId
]);
const UnpinStatementEventData = PinStatementEventData;
const HideStatementEventData = PinStatementEventData;

const NewVoteEventData = z.tuple([
  z.string(), // voter
  z.number(), // discussionId
  z.number(), // statementId
  z.union([z.literal(1), z.literal(2), z.literal(3)]) // choice
]);

const NewRoleEventData = z.tuple([
  z.string(), // spaceId
  z.string(), // id
  z.string(), // name
  z.string(), // description
  z.string() // color
]);
const EditRoleEventData = NewRoleEventData;

const DeleteRoleEventData = z.tuple([
  z.string(), // spaceId
  z.string() // id
]);

const ClaimRoleEventData = z.tuple([
  z.string(), // spaceId
  z.string(), // id
  z.string() // address
]);
const RevokeRoleEventData = ClaimRoleEventData;

export function createWriters(indexerName: string) {
  const handleSetAlias: Writer = async ({ unit, payload }) => {
    const [from, to] = SetAliasEventData.parse(payload.data);

    const alias = new Alias(`${from}:${to}`, indexerName);
    alias.address = from;
    alias.alias = to;
    alias.created = unit.timestamp;

    await alias.save();
  };

  const handleNewDiscussion: Writer = async ({ unit, payload }) => {
    const [id, author, title, body, discussionUrl] =
      NewDiscussionEventData.parse(payload.data);

    console.log('Handle new discussion', id, author, title, body);

    const discussion = new Discussion(id.toString(), indexerName);
    discussion.author = author;
    discussion.title = title;
    discussion.body = body;
    discussion.discussion_url = discussionUrl;
    discussion.statement_count = 0;
    discussion.vote_count = 0;
    discussion.created = unit.timestamp;

    await discussion.save();
  };

  const handleCloseDiscussion: Writer = async ({ payload }) => {
    const [discussionId] = CloseDiscussionEventData.parse(payload.data);

    console.log('Handle close discussion', discussionId);

    const discussion = await Discussion.loadEntity(
      discussionId.toString(),
      indexerName
    );

    if (discussion) {
      discussion.closed = true;

      await discussion.save();
    }
  };

  const handleNewStatement: Writer = async ({ unit, payload }) => {
    const [id, author, discussionId, body] = NewStatementEventData.parse(
      payload.data
    );

    console.log('Handle new statement', id, author, discussionId, body);

    const statement = new Statement(`${discussionId}/${id}`, indexerName);
    statement.author = author;
    statement.body = body;
    statement.vote_count = 0;
    statement.scores_1 = 0;
    statement.scores_2 = 0;
    statement.scores_3 = 0;
    statement.created = unit.timestamp;
    statement.statement_id = id;
    statement.discussion_id = discussionId;
    statement.discussion = discussionId.toString();

    await statement.save();

    const discussion = await Discussion.loadEntity(
      discussionId.toString(),
      indexerName
    );

    if (discussion) {
      discussion.statement_count += 1;

      await discussion.save();
    }
  };

  const handlePinStatement: Writer = async ({ payload }) => {
    const [discussionId, statementId] = PinStatementEventData.parse(
      payload.data
    );

    console.log('Handle pin statement vote', discussionId, statementId);

    const statement = await Statement.loadEntity(
      `${discussionId}/${statementId}`,
      indexerName
    );

    if (statement) {
      statement.pinned = true;

      await statement.save();
    }
  };

  const handleUnpinStatement: Writer = async ({ payload }) => {
    const [discussionId, statementId] = UnpinStatementEventData.parse(
      payload.data
    );

    console.log('Handle unpin statement', discussionId, statementId);

    const statement = await Statement.loadEntity(
      `${discussionId}/${statementId}`,
      indexerName
    );

    if (statement) {
      statement.pinned = false;

      await statement.save();
    }
  };

  const handleHideStatement: Writer = async ({ payload }) => {
    const [discussionId, statementId] = HideStatementEventData.parse(
      payload.data
    );

    console.log('Handle hide statement vote', discussionId, statementId);

    const statement = await Statement.loadEntity(
      `${discussionId}/${statementId}`,
      indexerName
    );

    if (statement) {
      statement.hidden = true;

      await statement.save();
    }
  };

  const handleNewVote: Writer = async ({ unit, payload }) => {
    const [voter, discussionId, statementId, choice] = NewVoteEventData.parse(
      payload.data
    );

    console.log('Handle new vote', voter, discussionId, statementId, choice);

    const id = `${discussionId}/${statementId}/${voter}`;
    const vote = new Vote(id, indexerName);
    vote.voter = voter;
    vote.choice = choice;
    vote.created = unit.timestamp;
    vote.discussion_id = discussionId;
    vote.statement_id = statementId;
    vote.discussion = discussionId.toString();
    vote.statement = statementId.toString();

    await vote.save();

    const discussion = await Discussion.loadEntity(
      discussionId.toString(),
      indexerName
    );
    const statement = await Statement.loadEntity(
      `${discussionId}/${statementId}`,
      indexerName
    );

    if (discussion && statement) {
      discussion.vote_count += 1;
      statement.vote_count += 1;
      statement[`scores_${choice}`] += 1;

      await discussion.save();
      await statement.save();
    }
  };

  const handleNewRole: Writer = async ({ unit, payload }) => {
    const [spaceId, id, name, description, color] = NewRoleEventData.parse(
      payload.data
    );

    console.log('Handle new role', spaceId, id, name, description, color);

    const role = new Role(id.toString(), indexerName);
    role.space = spaceId;
    role.name = name;
    role.description = description;
    role.color = color;
    role.created = unit.timestamp;
    await role.save();
  };

  const handleEditRole: Writer = async ({ payload }) => {
    const [spaceId, id, name, description, color] = EditRoleEventData.parse(
      payload.data
    );

    console.log('Handle edit role', spaceId, id, name, description, color);

    const role = await Role.loadEntity(id.toString(), indexerName);
    if (!role) return;

    role.space = spaceId;
    role.name = name;
    role.description = description;
    role.color = color;
    await role.save();
  };

  const handleDeleteRole: Writer = async ({ payload }) => {
    const [spaceId, id] = DeleteRoleEventData.parse(payload.data);

    console.log('Handle delete role', spaceId, id);

    const role = await Role.loadEntity(id.toString(), indexerName);
    if (!role) return;

    role.deleted = true;

    await role.save();
  };

  const handleClaimRole: Writer = async ({ payload }) => {
    const [spaceId, id, userAddress] = ClaimRoleEventData.parse(payload.data);

    console.log('Handle claim role', spaceId, id, userAddress);

    let user = await User.loadEntity(userAddress, indexerName);
    if (!user) user = new User(userAddress, indexerName);
    await user.save();

    let userRole = await UserRole.loadEntity(
      `${spaceId}:${id}:${userAddress}`,
      indexerName
    );

    if (!userRole) {
      userRole = new UserRole(`${spaceId}:${id}:${userAddress}`, indexerName);
      userRole.user = userAddress;
      userRole.role = id;
      await userRole.save();
    }
  };

  const handleRevokeRole: Writer = async ({ payload }) => {
    const [spaceId, id, userAddress] = RevokeRoleEventData.parse(payload.data);

    console.log('Handle revoke role', spaceId, id, userAddress);

    let user = await User.loadEntity(userAddress, indexerName);
    if (!user) user = new User(userAddress, indexerName);
    await user.save();

    const userRole = await UserRole.loadEntity(
      `${spaceId}:${id}:${userAddress}`,
      indexerName
    );

    if (userRole) {
      await userRole.delete();
    }
  };

  return {
    // aliases
    handleSetAlias,
    // townhall
    handleNewDiscussion,
    handleCloseDiscussion,
    handleNewStatement,
    handlePinStatement,
    handleUnpinStatement,
    handleHideStatement,
    handleNewVote,
    handleNewRole,
    handleEditRole,
    handleDeleteRole,
    handleClaimRole,
    handleRevokeRole
  };
}
