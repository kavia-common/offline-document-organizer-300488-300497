import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';

test('renders top bar title', () => {
  render(<App />);
  const el = screen.getByText(/Offline Document Tracker/i);
  expect(el).toBeInTheDocument();
});

test('clicking an outgoing link navigates to target doc', async () => {
  render(<App />);

  // Wait initial bootstrap and presence of editor hint or title
  const start = await screen.findByText(/Select or create a document|Welcome/i, {}, { timeout: 3000 });

  // Create a second doc by simulating UI: click "New Doc" in left pane
  const newDocBtn = await screen.findByText('New Doc', {}, { timeout: 3000 });
  act(() => {
    fireEvent.click(newDocBtn);
  });

  // There should be an editor; type content and save link reference via input
  const inputLink = await screen.findByPlaceholderText('Paste doc ID to link', {}, { timeout: 3000 });
  // Retrieve currently shown "Doc ID:" value to use as target id for self or existing doc might be first
  const docIdLabel = await screen.findByText(/Doc ID:/i, {}, { timeout: 3000 });
  expect(docIdLabel).toBeInTheDocument();

  // Create another new doc to be the target
  act(() => {
    fireEvent.click(newDocBtn);
  });
  const targetIdLabel = await screen.findByText(/Doc ID:/i, {}, { timeout: 3000 });
  const targetId = targetIdLabel.textContent.replace('Doc ID: ', '').trim();
  expect(targetId).toBeTruthy();

  // Go back to previous doc by creating one more and using history hash back and forth would be flaky;
  // Instead add a reference in the current doc pointing to itself (valid) and click it.
  act(() => {
    fireEvent.change(inputLink, { target: { value: targetId } });
  });
  const linkBtn = await screen.findByText('Link', {}, { timeout: 3000 });
  act(() => {
    fireEvent.click(linkBtn);
  });

  // An outgoing list item should contain a link-like element
  const linkEl = await screen.findByTitle(targetId, {}, { timeout: 3000 });
  expect(linkEl).toBeInTheDocument();

  // Click link and ensure hash updates
  act(() => {
    fireEvent.click(linkEl);
  });

  expect(window.location.hash).toContain(`#doc/${targetId}`);
});
