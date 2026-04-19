import _request from '../lib/request';
import { usersRoutes, articlesRoutes, categoriesRoutes, commentsRoutes } from '../endpoints';
import { StatusCodes } from 'http-status-codes';

describe('Custom Pagination and Sorting Tests', () => {
  const commonHeaders = { Accept: 'application/json' };

  it('1. should return paginated users with total, page, limit, and data', async () => {
    await _request.post(usersRoutes.create).set(commonHeaders).send({ login: 'user1_paginated', password: 'password123' });
    await _request.post(usersRoutes.create).set(commonHeaders).send({ login: 'user2_paginated', password: 'password123' });

    const response = await _request.get(`${usersRoutes.getAll}?page=1&limit=1`).set(commonHeaders);

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('page', 1);
    expect(response.body).toHaveProperty('limit', 1);
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.data.length).toBe(1);
  });

  it('2. should sort articles by title in desc order', async () => {
    // Using title 'ZZZ' to ensure it's first when sorted DESC, even if trash exists
    const titleA = 'AAA_sorting_test';
    const titleB = 'ZZZ_sorting_test';
    await _request.post(articlesRoutes.create).set(commonHeaders).send({ title: titleA, content: 'Content A' });
    await _request.post(articlesRoutes.create).set(commonHeaders).send({ title: titleB, content: 'Content B' });

    const response = await _request.get(`${articlesRoutes.getAll}?sortBy=title&order=desc`).set(commonHeaders);

    expect(response.status).toBe(StatusCodes.OK);
    // Find our test articles by title to check relative order
    const data = response.body.data || response.body;
    const indexA = data.findIndex(a => a.title === titleA);
    const indexB = data.findIndex(a => a.title === titleB);

    expect(indexB).not.toBe(-1);
    expect(indexA).not.toBe(-1);
    expect(indexB).toBeLessThan(indexA);
  });

  it('3. should return empty data array for out of range page', async () => {
    const response = await _request.get(`${categoriesRoutes.getAll}?page=999&limit=10`).set(commonHeaders);

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.data.length).toBe(0);
  });

  it('4. should filter articles and paginate results', async () => {
    const catResp = await _request.post(categoriesRoutes.create).set(commonHeaders).send({ name: 'Tech_filter', description: 'Tech stuff' });
    const catId = catResp.body.id;

    await _request.post(articlesRoutes.create).set(commonHeaders).send({ title: 'Article 1_filter', content: 'C1', categoryId: catId });
    await _request.post(articlesRoutes.create).set(commonHeaders).send({ title: 'Article 2_filter', content: 'C2', categoryId: catId });

    const response = await _request.get(`${articlesRoutes.getAll}?categoryId=${catId}&page=1&limit=1`).set(commonHeaders);

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.total).toBeGreaterThanOrEqual(2);
    expect(response.body.data.length).toBe(1);
    expect(response.body.data[0].categoryId).toBe(catId);
  });

  it('5. should sort comments by createdAt', async () => {
    const artResp = await _request.post(articlesRoutes.create).set(commonHeaders).send({ title: 'Comment Test_sorting', content: 'Content' });
    const artId = artResp.body.id;

    const firstContent = 'First_comment_sorting';
    const lastContent = 'Last_comment_sorting';

    await _request.post(commentsRoutes.create).set(commonHeaders).send({ content: firstContent, articleId: artId });
    await new Promise(resolve => setTimeout(resolve, 50));
    await _request.post(commentsRoutes.create).set(commonHeaders).send({ content: lastContent, articleId: artId });

    const response = await _request.get(`${commentsRoutes.getByArticle(artId)}&sortBy=createdAt&order=desc`).set(commonHeaders);

    expect(response.status).toBe(StatusCodes.OK);
    const data = response.body.data || response.body;
    expect(data[0].content).toBe(lastContent);
    expect(data[1].content).toBe(firstContent);
  });
});
