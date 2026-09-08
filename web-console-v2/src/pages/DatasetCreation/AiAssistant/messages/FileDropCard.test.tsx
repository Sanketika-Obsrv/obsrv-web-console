import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileDropCard from './FileDropCard';

const jsonFile = (name: string, contents: string) =>
  new File([contents], name, { type: 'application/json' });

const dropInput = () => screen.getByLabelText(/choose a sample file/i);

describe('choosing a file', () => {
  it('parses a JSON array into rows', async () => {
    const onRows = jest.fn();
    render(<FileDropCard onRows={onRows} />);

    await userEvent.upload(
      dropInput(),
      jsonFile('orders.json', '[{"order_id":"ORD-1"},{"order_id":"ORD-2"}]'),
    );

    await waitFor(() =>
      expect(onRows).toHaveBeenCalledWith(
        [{ order_id: 'ORD-1' }, { order_id: 'ORD-2' }],
        expect.objectContaining({ name: 'orders.json' }),
      ),
    );
  });

  it('treats a single JSON object as one row', async () => {
    const onRows = jest.fn();
    render(<FileDropCard onRows={onRows} />);

    await userEvent.upload(
      dropInput(),
      jsonFile('order.json', '{"order_id":"ORD-1"}'),
    );

    await waitFor(() =>
      expect(onRows).toHaveBeenCalledWith(
        [{ order_id: 'ORD-1' }],
        expect.anything(),
      ),
    );
  });

  /** JSONL is what the wizard accepts, so the assistant must too. */
  it('parses JSONL, one object per line', async () => {
    const onRows = jest.fn();
    render(<FileDropCard onRows={onRows} />);

    await userEvent.upload(
      dropInput(),
      new File(
        ['{"order_id":"ORD-1"}\n{"order_id":"ORD-2"}\n'],
        'orders.jsonl',
        { type: 'application/x-ndjson' },
      ),
    );

    await waitFor(() =>
      expect(onRows).toHaveBeenCalledWith(
        [{ order_id: 'ORD-1' }, { order_id: 'ORD-2' }],
        expect.anything(),
      ),
    );
  });

  it('ignores blank lines in JSONL', async () => {
    const onRows = jest.fn();
    render(<FileDropCard onRows={onRows} />);

    await userEvent.upload(
      dropInput(),
      new File(['{"a":1}\n\n{"a":2}\n'], 'orders.jsonl', {
        type: 'application/x-ndjson',
      }),
    );

    await waitFor(() =>
      expect(onRows).toHaveBeenCalledWith(
        [{ a: 1 }, { a: 2 }],
        expect.anything(),
      ),
    );
  });

  it('reports a file that is not JSON at all', async () => {
    const onRows = jest.fn();
    render(<FileDropCard onRows={onRows} />);

    await userEvent.upload(
      dropInput(),
      jsonFile('orders.json', 'not json at all'),
    );

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/could not read/i),
    );
    expect(onRows).not.toHaveBeenCalled();
  });

  /** The wizard caps the sample at 1 MB, so the same limit applies here. */
  it('refuses a file over the size limit without reading it', async () => {
    const onRows = jest.fn();
    render(<FileDropCard onRows={onRows} maxBytes={10} />);

    await userEvent.upload(
      dropInput(),
      jsonFile('big.json', '[{"order_id":"ORD-1"}]'),
    );

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/too large/i),
    );
    expect(onRows).not.toHaveBeenCalled();
  });

  it('reports an empty file rather than zero rows', async () => {
    const onRows = jest.fn();
    render(<FileDropCard onRows={onRows} />);

    await userEvent.upload(dropInput(), jsonFile('empty.json', '[]'));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/no records/i),
    );
    expect(onRows).not.toHaveBeenCalled();
  });
});

/**
 * Pasting is a first-class path, not a fallback: it is how the wizard's own
 * ingestion step lets you supply a sample without a file.
 */
describe('pasting JSON', () => {
  const pasteBox = () => screen.getByLabelText(/paste json/i);

  it('parses what was pasted', async () => {
    const onRows = jest.fn();
    render(<FileDropCard onRows={onRows} />);

    fireEvent.change(pasteBox(), {
      target: { value: '[{"order_id":"ORD-1"}]' },
    });
    await userEvent.click(screen.getByRole('button', { name: /use this/i }));

    expect(onRows).toHaveBeenCalledWith(
      [{ order_id: 'ORD-1' }],
      expect.objectContaining({ name: expect.stringMatching(/\.json$/) }),
    );
  });

  it('names the pasted sample as a file, since the API takes an upload', async () => {
    const onRows = jest.fn();
    render(<FileDropCard onRows={onRows} />);

    fireEvent.change(pasteBox(), { target: { value: '{"a":1}' } });
    await userEvent.click(screen.getByRole('button', { name: /use this/i }));

    const [, file] = onRows.mock.calls[0];
    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe('application/json');
  });

  it('reports invalid JSON without dispatching', async () => {
    const onRows = jest.fn();
    render(<FileDropCard onRows={onRows} />);

    fireEvent.change(pasteBox(), { target: { value: '{oops' } });
    await userEvent.click(screen.getByRole('button', { name: /use this/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/could not read/i);
    expect(onRows).not.toHaveBeenCalled();
  });

  it('does nothing when nothing was pasted', async () => {
    const onRows = jest.fn();
    render(<FileDropCard onRows={onRows} />);

    expect(screen.getByRole('button', { name: /use this/i })).toBeDisabled();
    expect(onRows).not.toHaveBeenCalled();
  });
});

describe('the prompt', () => {
  it('uses the wording it is given', () => {
    render(
      <FileDropCard onRows={jest.fn()} prompt="Drop the orders export here" />,
    );

    expect(
      screen.getByText(/drop the orders export here/i),
    ).toBeInTheDocument();
  });

  it('says what it accepts and how big', () => {
    render(<FileDropCard onRows={jest.fn()} />);

    expect(screen.getByText(/json or jsonl/i)).toBeInTheDocument();
    expect(screen.getByText(/1 MB/i)).toBeInTheDocument();
  });
});
