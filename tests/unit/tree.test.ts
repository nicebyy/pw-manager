import { describe, expect, it } from 'vitest';
import {
  addNodeToTree,
  countTreeStats,
  createKeyValuePair,
  createVaultNode,
  deleteNodeFromTree,
  filterTreeByQuery,
  findNodeById,
  getNodeBreadcrumbs,
  updateNodeInTree,
} from '../../src/core/tree.ts';

describe('multi-level tree engine', () => {
  it('supports arbitrary multi-level nesting, breadcrumbs, updates, and deletion', () => {
    const root = createVaultNode({ title: 'Company' });
    const level1 = createVaultNode({
      parentId: root.id,
      title: 'Cloud',
      image: { type: 'preset', value: 'aws' },
    });
    const level2 = createVaultNode({
      parentId: level1.id,
      title: 'Production EC2',
      image: { type: 'custom', value: 'data:image/png;base64,AAAA' },
      pairs: [
        createKeyValuePair('Host', '10.0.0.12', false),
        createKeyValuePair('SSH Key', 'secret-pem', true),
      ],
    });

    let tree = addNodeToTree([], null, root);
    tree = addNodeToTree(tree, root.id, level1);
    tree = addNodeToTree(tree, level1.id, level2);

    const found = findNodeById(tree, level2.id);
    expect(found?.title).toBe('Production EC2');
    expect(found?.image?.type).toBe('custom');

    const crumbs = getNodeBreadcrumbs(tree, level2.id);
    expect(crumbs.map((c) => c.title)).toEqual(['Company', 'Cloud', 'Production EC2']);

    tree = updateNodeInTree(tree, level2.id, { title: 'Prod Bastion' });
    expect(findNodeById(tree, level2.id)?.title).toBe('Prod Bastion');

    expect(countTreeStats(tree)).toEqual({ totalNodes: 3, totalPairs: 2 });

    tree = deleteNodeFromTree(tree, level1.id);
    expect(findNodeById(tree, level2.id)).toBeNull();
    expect(countTreeStats(tree)).toEqual({ totalNodes: 1, totalPairs: 0 });
  });

  it('filters tree by query while preserving ancestor paths and hiding secret values from search', () => {
    const root = createVaultNode({ title: 'Personal' });
    const gh = createVaultNode({
      parentId: root.id,
      title: 'GitHub',
      pairs: [
        createKeyValuePair('Username', 'alice', false),
        createKeyValuePair('Password', 'HiddenSecret999', true),
      ],
    });
    const dc = createVaultNode({
      parentId: root.id,
      title: 'Discord',
      pairs: [createKeyValuePair('Tag', 'alice#0001', false)],
    });

    let tree = addNodeToTree([], null, root);
    tree = addNodeToTree(tree, root.id, gh);
    tree = addNodeToTree(tree, root.id, dc);

    const filteredByTitle = filterTreeByQuery(tree, 'github');
    expect(filteredByTitle).toHaveLength(1);
    expect(filteredByTitle[0].children).toHaveLength(1);
    expect(filteredByTitle[0].children[0].title).toBe('GitHub');

    // Secret pair values must not match search queries
    const filteredBySecret = filterTreeByQuery(tree, 'HiddenSecret999');
    expect(filteredBySecret).toHaveLength(0);
  });
});
