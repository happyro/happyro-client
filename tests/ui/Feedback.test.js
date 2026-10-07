import { expect, it } from 'vitest';
import { createFeedback } from '../../src/UI/Components/Feedback.js';
it('does not replay polled feedback or erase action results with an empty snapshot', () => {
 const body = document.body.appendChild(document.createElement('div'));
 const feedback = createFeedback(body);
 feedback.update('等待服务器');
 feedback('操作完成'); const toast = document.querySelector('.ui-toast');
 feedback.update('等待服务器'); feedback.update('');
 expect(document.querySelector('.ui-toast')).toBe(toast);
 expect(toast.textContent).toBe('操作完成');
});
it('ignores asynchronous feedback after replacing the menu contents', () => {
 const body = document.body.appendChild(document.createElement('div'));
 const feedback = createFeedback(body);
 body.replaceChildren(); feedback('旧结果');
 expect(document.querySelector('.ui-toast')).toBeNull();
});
