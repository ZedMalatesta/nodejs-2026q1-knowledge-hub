-- CreateIndex
CREATE INDEX "Article_status_idx" ON "Article"("status");

-- CreateIndex
CREATE INDEX "Article_categoryId_idx" ON "Article"("categoryId");

-- CreateIndex
CREATE INDEX "Article_authorId_idx" ON "Article"("authorId");

-- CreateIndex
CREATE INDEX "Comment_articleId_idx" ON "Comment"("articleId");

-- CreateIndex
CREATE INDEX "Comment_authorId_idx" ON "Comment"("authorId");

-- CreateIndex
CREATE INDEX "Tag_name_idx" ON "Tag"("name");
