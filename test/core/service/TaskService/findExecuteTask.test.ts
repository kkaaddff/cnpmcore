import assert = require('assert');
import { app } from 'egg-mock/bootstrap';
import { Context } from 'egg';
import { TaskService } from 'app/core/service/TaskService';
import { PackageSyncerService } from 'app/core/service/PackageSyncerService';
import { TaskState, TaskType } from 'app/common/enum/Task';

describe('test/core/service/TaskService/findExecuteTask.test.ts', () => {
  let ctx: Context;
  let taskService: TaskService;
  let packageSyncerService: PackageSyncerService;

  beforeEach(async () => {
    ctx = await app.mockModuleContext();
    taskService = await ctx.getEggObject(TaskService);
    packageSyncerService = await ctx.getEggObject(PackageSyncerService);
  });

  afterEach(async () => {
    await app.destroyModuleContext(ctx);
  });

  describe('findExecuteTask()', () => {
    it('should get a task to execute', async () => {
      let task = await taskService.findExecuteTask(TaskType.SyncPackage);
      assert(!task);

      const newTask = await packageSyncerService.createTask('foo');
      assert(newTask);
      app.expectLog(/queue size: 1/);
      assert(!newTask.data.taskWorker);
      // same task not create again
      const newTask2 = await packageSyncerService.createTask('foo');
      assert(newTask2);
      assert(newTask2.taskId === newTask.taskId);
      assert(!newTask2.data.taskWorker);
      app.expectLog(/queue size: 1/);

      // find other task type
      task = await taskService.findExecuteTask(TaskType.SyncBinary);
      assert(!task);

      task = await taskService.findExecuteTask(TaskType.SyncPackage);
      assert(task);
      assert(task.targetName === 'foo');
      assert(task.taskId === newTask.taskId);
      assert(task.data.taskWorker);
      assert(task.state === TaskState.Processing);

      // find again will null
      task = await taskService.findExecuteTask(TaskType.SyncPackage);
      assert(!task);
    });

    it('should get multi tasks to execute', async () => {
      for (let i = 0; i < 10; i++) {
        await packageSyncerService.createTask(`foo-${i}`);
      }
      for (let i = 0; i < 10; i++) {
        const task = await taskService.findExecuteTask(TaskType.SyncPackage);
        assert(task);
      }
      let task = await taskService.findExecuteTask(TaskType.SyncPackage);
      assert(!task);
      await packageSyncerService.createTask('foo');
      task = await taskService.findExecuteTask(TaskType.SyncPackage);
      assert(task);
      task = await taskService.findExecuteTask(TaskType.SyncPackage);
      assert(!task);
    });

    it('should check task state before execute', async () => {
      const task1 = await packageSyncerService.createTask('foo-1');
      const task2 = await packageSyncerService.createTask('foo-2');
      // task 已被执行成功
      await taskService.finishTask(task1, TaskState.Success, '');

      const executeTask = await taskService.findExecuteTask(task1.type);

      // 直接返回下一个 task2
      assert(executeTask?.taskId === task2.taskId);
    });

    it('should return null when no valid task', async () => {
      const task1 = await packageSyncerService.createTask('foo-1');
      // task 已被执行成功
      await taskService.finishTask(task1, TaskState.Success, '');

      const executeTask = await taskService.findExecuteTask(task1.type);

      // 直接返回下一个 task2
      assert(executeTask === null);
    });

  });
});
