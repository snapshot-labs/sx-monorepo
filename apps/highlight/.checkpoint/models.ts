import { Model } from '@snapshot-labs/checkpoint';

export class Space extends Model {
  static tableName = 'spaces';

  constructor(id: string, indexerName: string) {
    super(Space.tableName, indexerName);

    this.initialSet('id', id);
    this.initialSet('space_id', 0);
    this.initialSet('created', 0);
    this.initialSet('owner', "");
    this.initialSet('topic_count', 0);
    this.initialSet('vote_count', 0);
    this.initialSet('_indexer', "");
  }

  static async loadEntity(id: string, indexerName: string): Promise<Space | null> {
    const entity = await super._loadEntity(Space.tableName, id, indexerName);
    if (!entity) return null;

    const model = new Space(id, indexerName);
    model.setExists();

    for (const key in entity) {
      const value = entity[key] !== null && typeof entity[key] === 'object'
        ? JSON.stringify(entity[key])
        : entity[key];
      model.set(key, value);
    }

    return model;
  }

  get id(): string {
    return this.get('id');
  }

  set id(value: string) {
    this.set('id', value);
  }

  get space_id(): number {
    return this.get('space_id');
  }

  set space_id(value: number) {
    this.set('space_id', value);
  }

  get created(): number {
    return this.get('created');
  }

  set created(value: number) {
    this.set('created', value);
  }

  get owner(): string {
    return this.get('owner');
  }

  set owner(value: string) {
    this.set('owner', value);
  }

  get topic_count(): number {
    return this.get('topic_count');
  }

  set topic_count(value: number) {
    this.set('topic_count', value);
  }

  get vote_count(): number {
    return this.get('vote_count');
  }

  set vote_count(value: number) {
    this.set('vote_count', value);
  }

  get _indexer(): string {
    return this.get('_indexer');
  }

  set _indexer(value: string) {
    this.set('_indexer', value);
  }
}

export class Category extends Model {
  static tableName = 'categories';

  constructor(id: string, indexerName: string) {
    super(Category.tableName, indexerName);

    this.initialSet('id', id);
    this.initialSet('category_id', 0);
    this.initialSet('name', "");
    this.initialSet('slug', "");
    this.initialSet('description', "");
    this.initialSet('created', 0);
    this.initialSet('parent_category_id', 0);
    this.initialSet('parent_category', null);
    this.initialSet('topic_count', 0);
    this.initialSet('space', "");
    this.initialSet('_indexer', "");
  }

  static async loadEntity(id: string, indexerName: string): Promise<Category | null> {
    const entity = await super._loadEntity(Category.tableName, id, indexerName);
    if (!entity) return null;

    const model = new Category(id, indexerName);
    model.setExists();

    for (const key in entity) {
      const value = entity[key] !== null && typeof entity[key] === 'object'
        ? JSON.stringify(entity[key])
        : entity[key];
      model.set(key, value);
    }

    return model;
  }

  get id(): string {
    return this.get('id');
  }

  set id(value: string) {
    this.set('id', value);
  }

  get category_id(): number {
    return this.get('category_id');
  }

  set category_id(value: number) {
    this.set('category_id', value);
  }

  get name(): string {
    return this.get('name');
  }

  set name(value: string) {
    this.set('name', value);
  }

  get slug(): string {
    return this.get('slug');
  }

  set slug(value: string) {
    this.set('slug', value);
  }

  get description(): string {
    return this.get('description');
  }

  set description(value: string) {
    this.set('description', value);
  }

  get created(): number {
    return this.get('created');
  }

  set created(value: number) {
    this.set('created', value);
  }

  get parent_category_id(): number {
    return this.get('parent_category_id');
  }

  set parent_category_id(value: number) {
    this.set('parent_category_id', value);
  }

  get parent_category(): string | null {
    return this.get('parent_category');
  }

  set parent_category(value: string | null) {
    this.set('parent_category', value);
  }

  get topic_count(): number {
    return this.get('topic_count');
  }

  set topic_count(value: number) {
    this.set('topic_count', value);
  }

  get space(): string {
    return this.get('space');
  }

  set space(value: string) {
    this.set('space', value);
  }

  get _indexer(): string {
    return this.get('_indexer');
  }

  set _indexer(value: string) {
    this.set('_indexer', value);
  }
}

export class Alias extends Model {
  static tableName = 'aliases';

  constructor(id: string, indexerName: string) {
    super(Alias.tableName, indexerName);

    this.initialSet('id', id);
    this.initialSet('address', "");
    this.initialSet('alias', "");
    this.initialSet('created', 0);
    this.initialSet('_indexer', "");
  }

  static async loadEntity(id: string, indexerName: string): Promise<Alias | null> {
    const entity = await super._loadEntity(Alias.tableName, id, indexerName);
    if (!entity) return null;

    const model = new Alias(id, indexerName);
    model.setExists();

    for (const key in entity) {
      const value = entity[key] !== null && typeof entity[key] === 'object'
        ? JSON.stringify(entity[key])
        : entity[key];
      model.set(key, value);
    }

    return model;
  }

  get id(): string {
    return this.get('id');
  }

  set id(value: string) {
    this.set('id', value);
  }

  get address(): string {
    return this.get('address');
  }

  set address(value: string) {
    this.set('address', value);
  }

  get alias(): string {
    return this.get('alias');
  }

  set alias(value: string) {
    this.set('alias', value);
  }

  get created(): number {
    return this.get('created');
  }

  set created(value: number) {
    this.set('created', value);
  }

  get _indexer(): string {
    return this.get('_indexer');
  }

  set _indexer(value: string) {
    this.set('_indexer', value);
  }
}

export class Topic extends Model {
  static tableName = 'topics';

  constructor(id: string, indexerName: string) {
    super(Topic.tableName, indexerName);

    this.initialSet('id', id);
    this.initialSet('category_id', 0);
    this.initialSet('category', null);
    this.initialSet('title', "");
    this.initialSet('body', "");
    this.initialSet('discussion_url', "");
    this.initialSet('author', "");
    this.initialSet('post_count', 0);
    this.initialSet('vote_count', 0);
    this.initialSet('created', 0);
    this.initialSet('closed', false);
    this.initialSet('space', "");
    this.initialSet('topic_id', 0);
    this.initialSet('posts', "[]");
    this.initialSet('votes', "[]");
    this.initialSet('_indexer', "");
  }

  static async loadEntity(id: string, indexerName: string): Promise<Topic | null> {
    const entity = await super._loadEntity(Topic.tableName, id, indexerName);
    if (!entity) return null;

    const model = new Topic(id, indexerName);
    model.setExists();

    for (const key in entity) {
      const value = entity[key] !== null && typeof entity[key] === 'object'
        ? JSON.stringify(entity[key])
        : entity[key];
      model.set(key, value);
    }

    return model;
  }

  get id(): string {
    return this.get('id');
  }

  set id(value: string) {
    this.set('id', value);
  }

  get category_id(): number {
    return this.get('category_id');
  }

  set category_id(value: number) {
    this.set('category_id', value);
  }

  get category(): string | null {
    return this.get('category');
  }

  set category(value: string | null) {
    this.set('category', value);
  }

  get title(): string {
    return this.get('title');
  }

  set title(value: string) {
    this.set('title', value);
  }

  get body(): string {
    return this.get('body');
  }

  set body(value: string) {
    this.set('body', value);
  }

  get discussion_url(): string {
    return this.get('discussion_url');
  }

  set discussion_url(value: string) {
    this.set('discussion_url', value);
  }

  get author(): string {
    return this.get('author');
  }

  set author(value: string) {
    this.set('author', value);
  }

  get post_count(): number {
    return this.get('post_count');
  }

  set post_count(value: number) {
    this.set('post_count', value);
  }

  get vote_count(): number {
    return this.get('vote_count');
  }

  set vote_count(value: number) {
    this.set('vote_count', value);
  }

  get created(): number {
    return this.get('created');
  }

  set created(value: number) {
    this.set('created', value);
  }

  get closed(): boolean {
    return this.get('closed');
  }

  set closed(value: boolean) {
    this.set('closed', value);
  }

  get space(): string {
    return this.get('space');
  }

  set space(value: string) {
    this.set('space', value);
  }

  get topic_id(): number {
    return this.get('topic_id');
  }

  set topic_id(value: number) {
    this.set('topic_id', value);
  }

  get posts(): string[] {
    return JSON.parse(this.get('posts'));
  }

  set posts(value: string[]) {
    this.set('posts', JSON.stringify(value));
  }

  get votes(): string[] {
    return JSON.parse(this.get('votes'));
  }

  set votes(value: string[]) {
    this.set('votes', JSON.stringify(value));
  }

  get _indexer(): string {
    return this.get('_indexer');
  }

  set _indexer(value: string) {
    this.set('_indexer', value);
  }
}

export class Post extends Model {
  static tableName = 'posts';

  constructor(id: string, indexerName: string) {
    super(Post.tableName, indexerName);

    this.initialSet('id', id);
    this.initialSet('body', "");
    this.initialSet('author', "");
    this.initialSet('scores_1', 0);
    this.initialSet('scores_2', 0);
    this.initialSet('scores_3', 0);
    this.initialSet('vote_count', 0);
    this.initialSet('pinned', false);
    this.initialSet('hidden', false);
    this.initialSet('created', 0);
    this.initialSet('topic_id', 0);
    this.initialSet('post_id', 0);
    this.initialSet('space', "");
    this.initialSet('topic', "");
    this.initialSet('votes', "[]");
    this.initialSet('_indexer', "");
  }

  static async loadEntity(id: string, indexerName: string): Promise<Post | null> {
    const entity = await super._loadEntity(Post.tableName, id, indexerName);
    if (!entity) return null;

    const model = new Post(id, indexerName);
    model.setExists();

    for (const key in entity) {
      const value = entity[key] !== null && typeof entity[key] === 'object'
        ? JSON.stringify(entity[key])
        : entity[key];
      model.set(key, value);
    }

    return model;
  }

  get id(): string {
    return this.get('id');
  }

  set id(value: string) {
    this.set('id', value);
  }

  get body(): string {
    return this.get('body');
  }

  set body(value: string) {
    this.set('body', value);
  }

  get author(): string {
    return this.get('author');
  }

  set author(value: string) {
    this.set('author', value);
  }

  get scores_1(): number {
    return this.get('scores_1');
  }

  set scores_1(value: number) {
    this.set('scores_1', value);
  }

  get scores_2(): number {
    return this.get('scores_2');
  }

  set scores_2(value: number) {
    this.set('scores_2', value);
  }

  get scores_3(): number {
    return this.get('scores_3');
  }

  set scores_3(value: number) {
    this.set('scores_3', value);
  }

  get vote_count(): number {
    return this.get('vote_count');
  }

  set vote_count(value: number) {
    this.set('vote_count', value);
  }

  get pinned(): boolean {
    return this.get('pinned');
  }

  set pinned(value: boolean) {
    this.set('pinned', value);
  }

  get hidden(): boolean {
    return this.get('hidden');
  }

  set hidden(value: boolean) {
    this.set('hidden', value);
  }

  get created(): number {
    return this.get('created');
  }

  set created(value: number) {
    this.set('created', value);
  }

  get topic_id(): number {
    return this.get('topic_id');
  }

  set topic_id(value: number) {
    this.set('topic_id', value);
  }

  get post_id(): number {
    return this.get('post_id');
  }

  set post_id(value: number) {
    this.set('post_id', value);
  }

  get space(): string {
    return this.get('space');
  }

  set space(value: string) {
    this.set('space', value);
  }

  get topic(): string {
    return this.get('topic');
  }

  set topic(value: string) {
    this.set('topic', value);
  }

  get votes(): string[] {
    return JSON.parse(this.get('votes'));
  }

  set votes(value: string[]) {
    this.set('votes', JSON.stringify(value));
  }

  get _indexer(): string {
    return this.get('_indexer');
  }

  set _indexer(value: string) {
    this.set('_indexer', value);
  }
}

export class Vote extends Model {
  static tableName = 'votes';

  constructor(id: string, indexerName: string) {
    super(Vote.tableName, indexerName);

    this.initialSet('id', id);
    this.initialSet('voter', "");
    this.initialSet('choice', 0);
    this.initialSet('created', 0);
    this.initialSet('topic_id', 0);
    this.initialSet('post_id', 0);
    this.initialSet('space', "");
    this.initialSet('topic', "");
    this.initialSet('post', "");
    this.initialSet('_indexer', "");
  }

  static async loadEntity(id: string, indexerName: string): Promise<Vote | null> {
    const entity = await super._loadEntity(Vote.tableName, id, indexerName);
    if (!entity) return null;

    const model = new Vote(id, indexerName);
    model.setExists();

    for (const key in entity) {
      const value = entity[key] !== null && typeof entity[key] === 'object'
        ? JSON.stringify(entity[key])
        : entity[key];
      model.set(key, value);
    }

    return model;
  }

  get id(): string {
    return this.get('id');
  }

  set id(value: string) {
    this.set('id', value);
  }

  get voter(): string {
    return this.get('voter');
  }

  set voter(value: string) {
    this.set('voter', value);
  }

  get choice(): number {
    return this.get('choice');
  }

  set choice(value: number) {
    this.set('choice', value);
  }

  get created(): number {
    return this.get('created');
  }

  set created(value: number) {
    this.set('created', value);
  }

  get topic_id(): number {
    return this.get('topic_id');
  }

  set topic_id(value: number) {
    this.set('topic_id', value);
  }

  get post_id(): number {
    return this.get('post_id');
  }

  set post_id(value: number) {
    this.set('post_id', value);
  }

  get space(): string {
    return this.get('space');
  }

  set space(value: string) {
    this.set('space', value);
  }

  get topic(): string {
    return this.get('topic');
  }

  set topic(value: string) {
    this.set('topic', value);
  }

  get post(): string {
    return this.get('post');
  }

  set post(value: string) {
    this.set('post', value);
  }

  get _indexer(): string {
    return this.get('_indexer');
  }

  set _indexer(value: string) {
    this.set('_indexer', value);
  }
}

export class Role extends Model {
  static tableName = 'roles';

  constructor(id: string, indexerName: string) {
    super(Role.tableName, indexerName);

    this.initialSet('id', id);
    this.initialSet('space', "");
    this.initialSet('name', "");
    this.initialSet('description', "");
    this.initialSet('color', "");
    this.initialSet('isAdmin', false);
    this.initialSet('deleted', false);
    this.initialSet('created', 0);
    this.initialSet('_indexer', "");
  }

  static async loadEntity(id: string, indexerName: string): Promise<Role | null> {
    const entity = await super._loadEntity(Role.tableName, id, indexerName);
    if (!entity) return null;

    const model = new Role(id, indexerName);
    model.setExists();

    for (const key in entity) {
      const value = entity[key] !== null && typeof entity[key] === 'object'
        ? JSON.stringify(entity[key])
        : entity[key];
      model.set(key, value);
    }

    return model;
  }

  get id(): string {
    return this.get('id');
  }

  set id(value: string) {
    this.set('id', value);
  }

  get space(): string {
    return this.get('space');
  }

  set space(value: string) {
    this.set('space', value);
  }

  get name(): string {
    return this.get('name');
  }

  set name(value: string) {
    this.set('name', value);
  }

  get description(): string {
    return this.get('description');
  }

  set description(value: string) {
    this.set('description', value);
  }

  get color(): string {
    return this.get('color');
  }

  set color(value: string) {
    this.set('color', value);
  }

  get isAdmin(): boolean {
    return this.get('isAdmin');
  }

  set isAdmin(value: boolean) {
    this.set('isAdmin', value);
  }

  get deleted(): boolean {
    return this.get('deleted');
  }

  set deleted(value: boolean) {
    this.set('deleted', value);
  }

  get created(): number {
    return this.get('created');
  }

  set created(value: number) {
    this.set('created', value);
  }

  get _indexer(): string {
    return this.get('_indexer');
  }

  set _indexer(value: string) {
    this.set('_indexer', value);
  }
}

export class User extends Model {
  static tableName = 'users';

  constructor(id: string, indexerName: string) {
    super(User.tableName, indexerName);

    this.initialSet('id', id);
    this.initialSet('roles', "[]");
    this.initialSet('_indexer', "");
  }

  static async loadEntity(id: string, indexerName: string): Promise<User | null> {
    const entity = await super._loadEntity(User.tableName, id, indexerName);
    if (!entity) return null;

    const model = new User(id, indexerName);
    model.setExists();

    for (const key in entity) {
      const value = entity[key] !== null && typeof entity[key] === 'object'
        ? JSON.stringify(entity[key])
        : entity[key];
      model.set(key, value);
    }

    return model;
  }

  get id(): string {
    return this.get('id');
  }

  set id(value: string) {
    this.set('id', value);
  }

  get roles(): string[] {
    return JSON.parse(this.get('roles'));
  }

  set roles(value: string[]) {
    this.set('roles', JSON.stringify(value));
  }

  get _indexer(): string {
    return this.get('_indexer');
  }

  set _indexer(value: string) {
    this.set('_indexer', value);
  }
}

export class UserRole extends Model {
  static tableName = 'userroles';

  constructor(id: string, indexerName: string) {
    super(UserRole.tableName, indexerName);

    this.initialSet('id', id);
    this.initialSet('user', "");
    this.initialSet('role', "");
    this.initialSet('_indexer', "");
  }

  static async loadEntity(id: string, indexerName: string): Promise<UserRole | null> {
    const entity = await super._loadEntity(UserRole.tableName, id, indexerName);
    if (!entity) return null;

    const model = new UserRole(id, indexerName);
    model.setExists();

    for (const key in entity) {
      const value = entity[key] !== null && typeof entity[key] === 'object'
        ? JSON.stringify(entity[key])
        : entity[key];
      model.set(key, value);
    }

    return model;
  }

  get id(): string {
    return this.get('id');
  }

  set id(value: string) {
    this.set('id', value);
  }

  get user(): string {
    return this.get('user');
  }

  set user(value: string) {
    this.set('user', value);
  }

  get role(): string {
    return this.get('role');
  }

  set role(value: string) {
    this.set('role', value);
  }

  get _indexer(): string {
    return this.get('_indexer');
  }

  set _indexer(value: string) {
    this.set('_indexer', value);
  }
}
