import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import '@testing-library/jest-dom/extend-expect';
import ConnectorCard from './ConnectorCard';
import { connectorList } from '../connectorList';
import styles from './ConnectorCard.module.css';

test('renders Card components for each connector', () => {
  connectorList.forEach((cardInfo) => {
    const handleClick = jest.fn();
    render(
      <ConnectorCard
        name={cardInfo.name}
        imageUrl={cardInfo.imageUrl}
        selected={false}
        onClick={handleClick}
        isSelected={false}
      />,
    );
    const imageElement = screen.getByAltText(cardInfo.name);
    expect(imageElement).toBeInTheDocument();
    expect(imageElement).toHaveAttribute('src', cardInfo.imageUrl);
    const nameElement = screen.getByText(cardInfo.name);
    expect(nameElement).toBeInTheDocument();
  });
});

test('renders correctly with basic props', () => {
  connectorList.forEach((cardInfo) => {
    const handleClick = jest.fn();
    render(
      <ConnectorCard
        name={cardInfo.name}
        imageUrl={cardInfo.imageUrl}
        selected={false}
        onClick={handleClick}
        isSelected={false}
      />,
    );
    const imageElement = screen.getByAltText(cardInfo.name);
    expect(imageElement).toBeInTheDocument();
    const nameElement = screen.getByText(cardInfo.name);
    expect(nameElement).toBeInTheDocument();
  });
});

test('applies selected styles when selected', () => {
  connectorList.forEach((cardInfo) => {
    const handleClick = jest.fn();
    render(
      <ConnectorCard
        name={cardInfo.name}
        imageUrl={cardInfo.imageUrl}
        selected={true}
        onClick={handleClick}
        isSelected={false}
      />,
    );
    const selectedCardElements = screen.getAllByTestId('selected-card');
    selectedCardElements.forEach((element) => {
      expect(element).toHaveClass(styles.selectedCard);
    });
  });
});

test('applies selected image border when isSelected', () => {
  connectorList.forEach((cardInfo) => {
    const handleClick = jest.fn();
    render(
      <ConnectorCard
        name={cardInfo.name}
        imageUrl={cardInfo.imageUrl}
        selected={false}
        onClick={handleClick}
        isSelected={true}
      />,
    );

    const imageBorders = screen.getAllByTestId('image-border');
    imageBorders.forEach((BorderElement) => {
      expect(BorderElement).toHaveClass(styles.selectedImageBorder);
    });
  });
});

test('calls onClick when clicked', () => {
  connectorList.forEach((cardInfo) => {
    const handleClick = jest.fn();
    render(
      <ConnectorCard
        name={cardInfo.name}
        imageUrl={cardInfo.imageUrl}
        selected={false}
        onClick={handleClick}
        isSelected={false}
      />,
    );

    fireEvent.click(screen.getByAltText(cardInfo.name));
    expect(handleClick).toHaveBeenCalledTimes(1);
    cleanup();
  });
});

test('applies selected image styles when isSelected', () => {
  connectorList.forEach((cardInfo) => {
    const handleClick = jest.fn();
    render(
      <ConnectorCard
        name={cardInfo.name}
        imageUrl={cardInfo.imageUrl}
        selected={false}
        onClick={handleClick}
        isSelected={true}
      />,
    );

    expect(screen.getByAltText(cardInfo.name)).toHaveClass(
      styles.selectedCardImage,
    );
  });
});

test('renders correctly without image URL', () => {
  connectorList.forEach((cardInfo) => {
    const handleClick = jest.fn();
    render(
      <ConnectorCard
        name={cardInfo.name}
        imageUrl=""
        selected={false}
        onClick={handleClick}
        isSelected={false}
      />,
    );

    expect(screen.getByText(cardInfo.name)).toBeInTheDocument();
  });
});

test('ensures click handler receives correct event', () => {
  connectorList.forEach((cardInfo) => {
    const handleClick = jest.fn();
    render(
      <ConnectorCard
        name={cardInfo.name}
        imageUrl={cardInfo.imageUrl}
        selected={false}
        onClick={handleClick}
        isSelected={false}
      />,
    );

    const card = screen.getByText(cardInfo.name);
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledWith(expect.any(Object));
  });
});
