import * as React from 'react';
import { styled } from '@mui/material/styles';
import { GridRenderCellParams } from '@mui/x-data-grid-premium';

interface DemoLinkProps {
  href: string;
  children: string;
  tabIndex: number;
}

const Link = styled('a')({
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  color: 'inherit',
});

export const DemoLink = React.memo(function DemoLink(props: DemoLinkProps) {
  return (
    <Link tabIndex={props.tabIndex} href={props.href} target="_blank">
      {props.children}
    </Link>
  );
});

export function renderLink(params: GridRenderCellParams<string, any, any>) {
  if (params.rowNode.isAutoGenerated || !params.value) {
    return '';
  }

  return (
    <DemoLink href={params.value} tabIndex={params.tabIndex}>
      {params.value}
    </DemoLink>
  );
}